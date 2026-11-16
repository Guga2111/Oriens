#!/usr/bin/env python3
"""Actual Codex app-server protocol proof. No model turn, no external messages.
Only usable from test_mcp.py --clients, against its synthetic loopback application.
"""
import http.cookiejar
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
import queue
import pty
import re
import select
import tempfile
from pathlib import Path
import subprocess
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

P2=os.environ.get('MCP_P2_PROOF')=='1'
P4=os.environ.get('MCP_P4_PROOF')=='1'
DOMAIN_TITLE='Tarefa sintética via cliente P2'

def client_environment():
    # Only the consent harness owns the normal account JWT. Never inherit it into an AI client.
    return {key:value for key,value in os.environ.items() if not key.startswith('MCP_')
        and key not in ('JWT_SECRET','ORIENS_MCP_ENCRYPTION_PASSWORD','ORIENS_MCP_ENCRYPTION_SALT')}

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):return None

def consent(url):
    if P4:
        result=subprocess.check_output(['node','ops/mcp-account/p4_live_proof.mjs','--client-consent'],
            env=dict(os.environ,MCP_PROOF_AUTH_URL=url),text=True,timeout=45)
        return json.loads(result)['redirectUrl']
    issuer=os.environ['MCP_PROOF_ISSUER'];frontend=os.environ['MCP_PROOF_FRONTEND']
    assert url.startswith(issuer+'/oauth2/authorize?')
    jar=http.cookiejar.CookieJar();browser=urllib.request.build_opener(NoRedirect,urllib.request.HTTPCookieProcessor(jar))
    try:browser.open(url,timeout=10)
    except urllib.error.HTTPError as response:
        assert response.code==302
        location=response.headers['Location']
    assert location.startswith(frontend+'/config?mcpFlow=')
    flow=urllib.parse.parse_qs(urllib.parse.urlsplit(location).query)['mcpFlow'][0]
    endpoint=issuer+'/integrations/mcp/authorization-requests/'+flow
    headers={'Authorization':os.environ['MCP_PROOF_JWT'],'Origin':frontend}
    summary=json.load(browser.open(urllib.request.Request(endpoint,headers=headers),timeout=10))
    requested=set(summary['requestedScopes']);assert 'mcp:context' in requested
    scopes=['mcp:context']+(['offline_access'] if 'offline_access' in requested else [])
    if P2:
        assert {'tasks:read','tasks:create'}<=requested
        scopes+=['tasks:read','tasks:create']
    decision={'version':summary['version'],'approve':True,'name':'CLI sintético','scopes':scopes,'allowedProjectIds':[],'allowStandaloneTasks':P2}
    headers['Content-Type']='application/json'
    result=json.load(browser.open(urllib.request.Request(endpoint+'/decision',json.dumps(decision).encode(),headers),timeout=10))
    callback=result['redirectUrl'];host=urllib.parse.urlsplit(callback).hostname
    assert host in ('127.0.0.1','localhost')
    return callback

def setup_configuration(client):
    """Consume exactly the public setup and formatter used by the production UI."""
    request=urllib.request.Request(os.environ['MCP_PROOF_ISSUER']+'/integrations/mcp/setup?client='+client,
        headers={'Authorization':os.environ['MCP_PROOF_JWT']})
    setup=json.load(urllib.request.urlopen(request,timeout=10))
    script="import {readFileSync} from 'node:fs';import {mcpSetupText} from '../oriens-front/src/lib/mcp-setup.ts';process.stdout.write(mcpSetupText(JSON.parse(readFileSync(0,'utf8'))));"
    return subprocess.check_output(['node','--input-type=module','-e',script],input=json.dumps(setup),text=True,timeout=10)

class Rpc:
    def __init__(self,command):
        self.p=subprocess.Popen(command,env=client_environment(),stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True,bufsize=1)
        self.items=queue.Queue();self.count=0;self.notifications=[]
        def reader():
            for line in self.p.stdout:
                try:self.items.put(json.loads(line))
                except ValueError:pass
        threading.Thread(target=reader,daemon=True).start()
    def send(self,message):self.p.stdin.write(json.dumps(message)+'\n');self.p.stdin.flush()
    def call(self,method,params):
        self.count+=1;key=self.count;self.send({'id':key,'method':method,'params':params})
        until=time.monotonic()+40
        while time.monotonic()<until:
            value=self.items.get(timeout=max(1,until-time.monotonic()))
            if value.get('id')==key:
                if 'error' in value:raise RuntimeError(method+': '+json.dumps(value['error']))
                return value['result']
            self.notifications.append(value)
        raise TimeoutError(method)
    def close(self):
        self.p.terminate()
        try:self.p.wait(timeout=10)
        except subprocess.TimeoutExpired:self.p.kill();self.p.wait()

def codex():
    name='oriens_p0_'+uuid.uuid4().hex[:8];issuer=os.environ['MCP_PROOF_ISSUER']
    requested=['mcp:context','offline_access']+(['tasks:read','tasks:create'] if P2 else [])
    definition='{'+name+'={url='+json.dumps(issuer+'/mcp')+',scopes='+json.dumps(requested)+',oauth={client_id="oriens-codex",callback_url="http://127.0.0.1/callback"}}}'
    if P4:
        import tomllib
        server=tomllib.loads(setup_configuration('codex'))['mcp_servers']['oriens']
        requested=server['scopes']
        # JSON objects use ':' while TOML inline tables use '='; serialize its known fields explicitly.
        definition='{'+name+'={url='+json.dumps(server['url'])+',scopes='+json.dumps(requested)+',oauth={client_id='+json.dumps(server['oauth']['client_id'])+',callback_url='+json.dumps(server['oauth']['callback_url'])+'}}}'
    config=['-c','mcp_servers='+definition,'-c','analytics.enabled=false','-c','feedback.enabled=false','-c','mcp_oauth_credentials_store="keyring"']
    rpc=Rpc(['codex',*config,'app-server','--stdio'])
    try:
        rpc.call('initialize',{'clientInfo':{'name':'oriens_p0','version':'1.0'},'capabilities':{'experimentalApi':True}})
        rpc.send({'method':'initialized'})
        login=rpc.call('mcpServer/oauth/login',{'name':name,'scopes':requested,'timeoutSecs':90})
        callback=consent(login['authorizationUrl'])
        # The app-server owns the loopback listener and validates state/issuer/PKCE itself.
        urllib.request.urlopen(callback,timeout=15).read()
        # Reload the connection after the OAuth completion notification, without starting inference.
        until=time.monotonic()+20
        while time.monotonic()<until:
            value=rpc.items.get(timeout=max(1,until-time.monotonic()))
            if value.get('method')=='mcpServer/oauthLogin/completed':
                assert value['params']['success'];break
        else:raise TimeoutError('Codex OAuth completion')
        rpc.call('config/mcpServer/reload',None)
        thread=rpc.call('thread/start',{'cwd':'/tmp','ephemeral':True,'approvalPolicy':'never','sandbox':'read-only'})['thread']['id']
        status=rpc.call('mcpServerStatus/list',{'threadId':thread,'serverName':name,'detail':'toolsAndAuthOnly'})
        assert 'oriens_get_context' in json.dumps(status)
        result=rpc.call('mcpServer/tool/call',{'threadId':thread,'server':name,'tool':'oriens_get_context','arguments':{}})
        assert 'CLI sintético' in json.dumps(result,ensure_ascii=False)
        if P2:
            assert 'oriens_create_task' in json.dumps(status)
            args={'idempotencyKey':str(uuid.uuid4()),'title':DOMAIN_TITLE}
            created=rpc.call('mcpServer/tool/call',{'threadId':thread,'server':name,'tool':'oriens_create_task','arguments':args})
            replay=rpc.call('mcpServer/tool/call',{'threadId':thread,'server':name,'tool':'oriens_create_task','arguments':args})
            assert DOMAIN_TITLE in json.dumps(created,ensure_ascii=False)
            assert '"replayed": true' in json.dumps(replay)
        return {'version':subprocess.check_output(['codex','--version'],text=True,env=client_environment()).strip(),'oauth':True,'initialize':True,'toolsList':True,'toolCall':True,'domainToolCall':P2,'domainReplay':P2,'productionConsent':P4,'productionSetup':P4,'inference':False,'applicationJwtPassedToClient':False}
    finally:
        rpc.close()
        subprocess.run(['codex',*config,'mcp','logout',name],env=client_environment(),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=15)

def claude():
    name='oriens_p0_'+uuid.uuid4().hex[:8];issuer=os.environ['MCP_PROOF_ISSUER']
    with tempfile.TemporaryDirectory(prefix='oriens-claude-p0-') as folder:
        env=dict(client_environment(),CLAUDE_CONFIG_DIR=folder,CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC='1',
            ANTHROPIC_API_KEY='synthetic-local-only',ANTHROPIC_BASE_URL='http://127.0.0.1:9')
        server=None
        if P4:
            server=json.loads(setup_configuration('claude-code'))['mcpServers']['oriens']
            subprocess.run(['claude','mcp','add-json','--scope','user',name,json.dumps(server)],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,check=True,timeout=15)
        else:
            subprocess.run(['claude','mcp','add','--scope','user','--transport','http','--client-id','oriens-claude-code','--callback-port','8765',name,issuer+'/mcp'],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,check=True,timeout=15)
        master,slave=pty.openpty()
        login=subprocess.Popen(['claude','mcp','login',name,'--no-browser'],env=env,stdin=slave,stdout=slave,stderr=slave,text=True)
        os.close(slave);text=''
        try:
            until=time.monotonic()+35;callback=None
            while time.monotonic()<until:
                if select.select([master],[],[],1)[0]:
                    try:text+=os.read(master,16384).decode(errors='replace')
                    except OSError:break
                match=re.search(r'http://127\.0\.0\.1:[0-9]+/oauth2/authorize\?[!-~]+',text)
                if match and callback is None:
                    callback=consent(match.group(0));os.write(master,(callback+'\n').encode())
                if login.poll() is not None:break
            assert callback is not None,'Claude did not expose a local authorization URL'
            assert login.wait(timeout=5)==0,'Claude OAuth login failed'
        finally:
            if login.poll() is None:login.terminate();login.wait(timeout=5)
            os.close(master)
        config=json.dumps({'mcpServers':{name:server or {'type':'http','url':issuer+'/mcp','oauth':{'clientId':'oriens-claude-code','callbackPort':8765}}}})
        process=subprocess.Popen(['claude','--print','--input-format','stream-json','--output-format','stream-json','--verbose',
            '--no-session-persistence','--setting-sources','','--strict-mcp-config','--mcp-config',config],env=env,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True,bufsize=1)
        items=queue.Queue()
        def reader():
            for line in process.stdout:
                try:items.put(json.loads(line))
                except ValueError:pass
        threading.Thread(target=reader,daemon=True).start()
        def control(subtype,**args):
            key=uuid.uuid4().hex;process.stdin.write(json.dumps({'type':'control_request','request_id':key,'request':{'subtype':subtype,**args}})+'\n');process.stdin.flush()
            until=time.monotonic()+25
            while time.monotonic()<until:
                item=items.get(timeout=max(1,until-time.monotonic()))
                if item.get('type')=='control_response' and item['response'].get('request_id')==key:return item['response']
            raise TimeoutError(subtype)
        try:
            control('initialize',hooks={},sdkMcpServers=[])
            until=time.monotonic()+15
            while True:
                status=control('mcp_status')
                if name in json.dumps(status) and 'connected' in json.dumps(status):break
                if time.monotonic()>until:raise AssertionError('Claude MCP connection not confirmed: '+json.dumps(status))
                time.sleep(.25)
            # The CLI control protocol cannot directly invoke an HTTP tool. Close it and
            # drive the real client with a deterministic local Messages fixture instead.
            process.terminate();process.wait(timeout=10)
            class Fixture(BaseHTTPRequestHandler):
                seen=False
                def log_message(self,*args):pass
                def do_POST(self):
                    request=json.loads(self.rfile.read(int(self.headers.get('Content-Length','0'))))
                    if self.path.startswith('/v1/messages/count_tokens'):
                        self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(b'{"input_tokens":1}');return
                    results=[block for message in request.get('messages',[]) for block in message.get('content',[]) if isinstance(block,dict) and block.get('type')=='tool_result']
                    Fixture.seen=Fixture.seen or any((DOMAIN_TITLE if P2 else 'CLI sintético') in json.dumps(block,ensure_ascii=False) for block in results)
                    tools=[t['name'] for t in request.get('tools',[]) if t['name'].endswith('__oriens_create_task' if P2 else '__oriens_get_context')]
                    assert tools,'The actual Claude client did not expose the MCP tool'
                    self.send_response(200);self.send_header('Content-Type','text/event-stream');self.end_headers()
                    def event(kind,data):self.wfile.write(('event: '+kind+'\n'+'data: '+json.dumps(data)+'\n\n').encode());self.wfile.flush()
                    event('message_start',{'type':'message_start','message':{'id':'msg_synthetic','type':'message','role':'assistant','content':[],'model':'claude-haiku-4-5','stop_reason':None,'stop_sequence':None,'usage':{'input_tokens':1,'output_tokens':1}}})
                    if not results:
                        event('content_block_start',{'type':'content_block_start','index':0,'content_block':{'type':'tool_use','id':'toolu_synthetic','name':tools[0],'input':{}}})
                        arguments={'idempotencyKey':str(uuid.uuid4()),'title':DOMAIN_TITLE} if P2 else {}
                        event('content_block_delta',{'type':'content_block_delta','index':0,'delta':{'type':'input_json_delta','partial_json':json.dumps(arguments)}})
                    else:
                        event('content_block_start',{'type':'content_block_start','index':0,'content_block':{'type':'text','text':''}})
                        event('content_block_delta',{'type':'content_block_delta','index':0,'delta':{'type':'text_delta','text':'Synthetic protocol proof complete.'}})
                    event('content_block_stop',{'type':'content_block_stop','index':0})
                    event('message_delta',{'type':'message_delta','delta':{'stop_reason':'end_turn' if results else 'tool_use','stop_sequence':None},'usage':{'output_tokens':1}})
                    event('message_stop',{'type':'message_stop'})
            local=ThreadingHTTPServer(('127.0.0.1',0),Fixture);threading.Thread(target=local.serve_forever,daemon=True).start()
            try:
                fixture_env=dict(env,ANTHROPIC_BASE_URL='http://127.0.0.1:'+str(local.server_port))
                run=subprocess.run(['claude','--print','Synthetic local protocol test.','--output-format','json','--no-session-persistence',
                    '--setting-sources','','--strict-mcp-config','--mcp-config',config,'--tools','','--allowedTools','mcp__'+name+('__oriens_create_task' if P2 else '__oriens_get_context'),
                    '--max-turns','2','--model','haiku'],env=fixture_env,cwd=folder,capture_output=True,text=True,timeout=50)
                assert run.returncode==0 and Fixture.seen,'Claude did not complete the local deterministic tool fixture'
            finally:local.shutdown();local.server_close()
            return {'version':subprocess.check_output(['claude','--version'],text=True,env=env).strip(),'oauth':True,'initialize':True,
                'toolsList':'oriens_get_context' in json.dumps(status),'toolCall':True,'domainToolCall':P2,'productionConsent':P4,'productionSetup':P4,'inference':False,'applicationJwtPassedToClient':False,
                'toolCallNote':'Real CLI with a deterministic Messages fixture on loopback; no external model or message.'}
        finally:
            process.terminate()
            try:process.wait(timeout=10)
            except subprocess.TimeoutExpired:process.kill();process.wait()
            subprocess.run(['claude','mcp','logout',name],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=15)

if __name__=='__main__':
    if P4:
        subprocess.run(['npm','run','build'],cwd=Path(__file__).resolve().parents[3]/'oriens-front',
            env=dict(os.environ,VITE_API_BASE_URL=os.environ['MCP_PROOF_ISSUER']),stdout=subprocess.DEVNULL,check=True,timeout=45)
    evidence={'codex':codex()}
    Path('target/mcp-client-proof.json').write_text(json.dumps(evidence,indent=2,ensure_ascii=False)+'\n')
    evidence['claude']=claude()
    Path('target/mcp-client-proof.json').write_text(json.dumps(evidence,indent=2,ensure_ascii=False)+'\n')
    print(json.dumps(evidence,ensure_ascii=False))
