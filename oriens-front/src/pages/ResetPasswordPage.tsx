import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import apiClient from "@/services/api";
import { toast } from "@/hooks/use-toast";

type PageStatus = 'validating' | 'ready' | 'submitting' | 'success' | 'error';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { isAuthenticated, isLoading: isAuthLoading } = useAuth(); 

  const [status, setStatus] = useState<PageStatus>('validating');
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState(""); 

  useEffect(() => {
    if (isAuthLoading) {
      setStatus('validating');
      return;
    }

    if (isAuthenticated) {
      navigate('/tasks'); 
      return;
    }

    const tokenFromUrl = searchParams.get("token");
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      setStatus('ready'); 
    } else {
      setStatus('error');
      setErrorMessage("Token não encontrado ou inválido. Por favor, solicite um novo link.");
    }
  }, [searchParams, isAuthLoading, isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(""); 

    if (password !== confirmPassword) {
      setErrorMessage("As senhas não coincidem.");
      return; 
    }
    if (!token) {
      setStatus('error');
      setErrorMessage("Token inválido.");
      return;
    }

    setStatus('submitting'); 

    try {
      await apiClient.post('/api/auth/reset-password', {
        token: token,
        newPassword: password,
      });

      setStatus('success');
      toast({ title: "Sucesso!", description: "Sua senha foi redefinida." });

    } catch (err: any) {
      console.error("Erro ao resetar senha:", err);
      const message = err.response?.data || "Token expirado ou inválido. Tente novamente.";
      setStatus('error');
      setErrorMessage(message);
      toast({ variant: "destructive", title: "Erro", description: message });
    }
  };

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="new-password">Nova Senha</Label>
        <Input
          id="new-password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
        <Input
          id="confirm-password"
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </div>

      {errorMessage && status === 'ready' && (
        <p className="text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {errorMessage}
        </p>
      )}

      <Button
        type="submit"
        className="w-full text-primary-foreground transition-[var(--transition-smooth)] hover:shadow-[var(--shadow-soft)] bg-gradient-primary hover:opacity-80"
        disabled={status === 'submitting'}
      >
        {status === 'submitting' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Salvar Nova Senha"}
      </Button>
    </form>
  );

  const renderSuccess = () => (
    <div className="space-y-4 text-center">
      <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
      <p>Sua senha foi redefinida com sucesso.</p>
      <Button asChild className="w-full text-primary-foreground transition-[var(--transition-smooth)] hover:shadow-[var(--shadow-soft)] bg-gradient-primary hover:opacity-80">
        <Link to="/auth">Ir para o Login</Link>
      </Button>
    </div>
  );

  const renderError = () => (
    <div className="space-y-4 text-center">
      <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
      <p className="text-destructive">{errorMessage}</p>
      <Button asChild className="w-full" variant="outline">
        <Link to="/">Voltar para o Login</Link>
      </Button>
    </div>
  );

  const renderValidating = () => (
     <div className="flex justify-center items-center h-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
     </div>
  );

  const renderContent = () => {
    switch (status) {
      case 'validating':
        return renderValidating();
      case 'ready':
      case 'submitting':
        return renderForm();
      case 'success':
        return renderSuccess();
      case 'error':
        return renderError();
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-accent/20 to-background">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card className="border-border/50 shadow-[var(--shadow-medium)]">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center">Redefinir Senha</CardTitle>
            <CardDescription className="text-center">
              {status === 'success' ? "Sua senha foi alterada!" : "Digite sua nova senha abaixo."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderContent()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPasswordPage;