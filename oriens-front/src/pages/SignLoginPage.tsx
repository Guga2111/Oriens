import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CheckSquare, Loader2, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/services/api";
import { toast } from "@/hooks/use-toast";

const SignLoginPage = () => {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");

  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');
  
  const [isLoginPasswordVisible, setLoginPasswordVisible] = useState(false);
  const [isRegisterPasswordVisible, setRegisterPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    console.log("Login:", { loginEmail, loginPassword });
    // Aqui você implementará a lógica de autenticação
    setLoginError('');

    try {
      
      const response = await apiClient.post('/authenticate', {
        email: loginEmail,
        password: loginPassword,
      });
      
      const authHeader = response.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      if (token) {
        toast({ title: "Login bem-sucedido!", description: "Redirecionando..." });
        login(token);
        navigate('/tasks')
      } else {
        throw new Error("Token não encontrado na resposta");
      }

    } catch (e) {
      console.log ('Falha no login: ', e);
      setLoginError('Email ou senha inválidos. Por favor, tente novamente.');
      toast({
        variant: "destructive",
        title: "Falha no login",
        description: "Email ou senha inválidos. Por favor, tente novamente.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');

    if (registerPassword !== registerConfirmPassword) {
      setRegisterError("As senhas não coincidem!");
      toast({ variant: "destructive", title: "Erro", description: "As senhas não coincidem!" });
      return;
    }

    setIsLoading(true);

    try {
      await apiClient.post('/user/register', {
        name: registerName,
        email: registerEmail,
        password: registerPassword,
      });

      const loginResponse = await apiClient.post('/authenticate', {
        email: registerEmail,
        password: registerPassword,
      });

      const token = loginResponse.data.token;

      if (token) {
        login(token);
        navigate('/tasks'); 
      }

    } catch (e) {
      console.error('Falha no registro: ', e);
      setRegisterError('Não foi possível criar a conta. O email já pode estar em uso.');
      toast({
        variant: "destructive",
        title: "Falha no registro",
        description: "Não foi possível criar a conta. O email já pode estar em uso.",
      });
    } finally {
      setIsLoading(false);
    }
};

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-accent/20 to-background">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Logo e Título */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-12 w-12 rounded-xl flex items-center justify-center shadow-[var(--shadow-soft)] bg-gradient-primary">
              <CheckSquare className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Oriens
            </h1>
          </div>
          <p className="text-muted-foreground text-center">
            Organize seu dia com eficiência
          </p>
        </div>

        {/* Card de Autenticação */}
        <Card className="border-border/50 shadow-[var(--shadow-medium)]">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center">Bem-vindo</CardTitle>
            <CardDescription className="text-center">
              Faça login ou crie sua conta para começar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Registrar</TabsTrigger>
              </TabsList>

              {/* Tab de Login */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">E-mail</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <div className="relative">
                    <Input
                      id="login-password"
                      type={isLoginPasswordVisible ? "text" : "password"}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <Button
                      type="button" 
                      variant="ghost"
                      size="icon"
                      className="absolute top-1/2 right-2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setLoginPasswordVisible(!isLoginPasswordVisible)}
                    >
                      {isLoginPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full text-primary-foreground transition-[var(--transition-smooth)] hover:shadow-[var(--shadow-soft)] bg-gradient-primary hover:opacity-80"
                    disabled={isLoading}
                  >
                   {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Entrar"}
                  </Button>
                  <div className="text-center text-sm">
                    <a href="#" className="text-primary hover:underline">
                      Esqueceu sua senha?
                    </a>
                  </div>
                </form>
              </TabsContent>

              {/* Tab de Registro */}
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Nome completo</Label>
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="Seu nome"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">E-mail</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Senha</Label>
                    <div className="relative">
                      <Input
                      id="register-password"
                      type={isRegisterPasswordVisible ? "text" : "password"}
                      placeholder="••••••••"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-1/2 right-2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setRegisterPasswordVisible(!isRegisterPasswordVisible)}
                    >
                      {isRegisterPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-confirm-password">Confirmar senha</Label>
                    <div className="relative">
                      <Input
                      id="register-confirm-password"
                      type={isConfirmPasswordVisible ? "text" : "password"}
                      placeholder="••••••••"
                      value={registerConfirmPassword}
                      onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-1/2 right-2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setConfirmPasswordVisible(!isConfirmPasswordVisible)}
                    >
                      {isConfirmPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full text-primary-foreground transition-[var(--transition-smooth)] hover:shadow-[var(--shadow-soft)] bg-gradient-primary hover:opacity-80"
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Criar conta"}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Ao criar uma conta, você concorda com nossos{" "}
                    <a href="#" className="text-primary hover:underline">
                      Termos de Serviço
                    </a>
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        <footer className="text-center text-sm text-muted-foreground mt-8">
          Organize seu dia • Alcance suas metas • Encontre seu fluxo
        </footer>
      </div>
    </div>
  );
};

export default SignLoginPage;
