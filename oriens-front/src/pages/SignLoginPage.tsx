import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { OriensLogo } from "@/components/common/OriensLogo";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/services/api";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

const SignLoginPage = () => {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false); 
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState(""); 
  const [forgotEmailSent, setForgotEmailSent] = useState(false); 

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
    setLoginError('');

    try {
      
      const response = await apiClient.post('/authenticate', {
        email: loginEmail,
        password: loginPassword,
      });
      
      const authHeader = response.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      if (token) {
        await login(token);
        navigate('/tasks')
      } else {
        throw new Error("Token não encontrado na resposta");
      }

    } catch (e) {
      console.error("Falha no login:", e);
      setLoginError("E-mail ou senha inválidos. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');

    if (registerPassword !== registerConfirmPassword) {
      setRegisterError("As senhas não coincidem.");
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

      const authHeader = loginResponse.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      if (token) {
        await login(token);
        navigate('/tasks'); 
      }

    } catch (e) {
      console.error('Falha no registro: ', e);
      setRegisterError("Não foi possível criar a conta. O e-mail já pode estar em uso.");
    } finally {
      setIsLoading(false);
    }
};

const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPasswordEmail) return;

    setIsLoading(true);
    try {
      await apiClient.post('/api/auth/forgot-password', {
        email: forgotPasswordEmail,
      });
      
      setForgotEmailSent(true);

    } catch (error) {
      console.error("Erro ao solicitar recuperação:", error);
      setForgotEmailSent(true); 
    } finally {
      setIsLoading(false);
    }
  };

  const handleModalOpenChange = (open: boolean) => {
    setIsForgotModalOpen(open);
    if (!open) {
      setForgotPasswordEmail("");
      setForgotEmailSent(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background-brand">
      <div className="w-full max-w-md">
        {/* Logo e Título */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex flex-col items-center gap-3">
            <OriensLogo className="h-12 w-12" title="Oriens" />
            <h1 className="text-3xl font-bold tracking-tight text-primary">
              Entrar no Oriens
            </h1>
          </div>
          <p className="mt-3 text-muted-foreground text-center">
            Organize seu dia com eficiência
          </p>
        </div>

        {/* Auth Card */}
        <Card className="border-border/50">
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

              {/* Login Tab */}
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
                      aria-invalid={Boolean(loginError)}
                      aria-describedby={loginError ? "login-error" : undefined}
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
                      aria-invalid={Boolean(loginError)}
                      aria-describedby={loginError ? "login-error" : undefined}
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
                  {loginError && (
                    <p
                      id="login-error"
                      role="alert"
                      className="text-sm text-destructive"
                    >
                      {loginError}
                    </p>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                   {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Entrar"}
                  </Button>
                  <div className="text-center text-sm">
                    <Dialog open={isForgotModalOpen} onOpenChange={handleModalOpenChange}>
                      <DialogTrigger asChild>
                        <button type="button" className="text-primary hover:underline focus:outline-none">
                          Esqueceu sua senha?
                        </button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        {!forgotEmailSent ? (
                          <>
                            <DialogHeader>
                              <DialogTitle>Recuperar Senha</DialogTitle>
                              <DialogDescription>
                                Digite seu e-mail para enviarmos um link de recuperação.
                              </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleForgotPassword} className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="forgot-email" className="sr-only">E-mail</Label>
                                <Input
                                  id="forgot-email"
                                  type="email"
                                  placeholder="seu@email.com"
                                  value={forgotPasswordEmail}
                                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                                  required
                                />
                              </div>
                              <DialogFooter>
                                <Button
                                  type="submit"
                                  className="w-full text-primary-foreground bg-primary hover:opacity-80"
                                  disabled={isLoading}
                                >
                                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Enviar link"}
                                </Button>
                              </DialogFooter>
                            </form>
                          </>
                        ) : (
                          <>
                            <DialogHeader>
                              <DialogTitle>Verifique seu E-mail</DialogTitle>
                              <DialogDescription>
                                Se uma conta com este e-mail existir, enviamos um link para você redefinir sua senha.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setIsForgotModalOpen(false)}>
                                Fechar
                              </Button>
                            </DialogFooter>
                          </>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </form>
              </TabsContent>

              {/* Register Tab */}
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Nome completo</Label>
                    <Input
                      id="register-name"
                      aria-invalid={Boolean(registerError)}
                      aria-describedby={registerError ? "register-error" : undefined}
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
                      aria-invalid={Boolean(registerError)}
                      aria-describedby={registerError ? "register-error" : undefined}
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
                      aria-invalid={Boolean(registerError)}
                      aria-describedby={registerError ? "register-error" : undefined}
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
                      aria-invalid={Boolean(registerError)}
                      aria-describedby={registerError ? "register-error" : undefined}
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
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="terms" 
                      checked={termsAccepted}
                      onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                    />
                    <Label htmlFor="terms" className="text-xs text-muted-foreground">
                      Eu li e concordo com os{" "}
                      <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Termos de Serviço
                      </a>
                      .
                    </Label>
                  </div>
                  
                  {registerError && (
                    <p
                      id="register-error"
                      role="alert"
                      className="text-sm text-destructive"
                    >
                      {registerError}
                    </p>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading || !termsAccepted}
                  >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Criar conta"}
                  </Button>
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
