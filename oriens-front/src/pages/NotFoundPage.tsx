import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { OriensLogo } from "@/components/common/OriensLogo";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background-brand px-6 text-center">
      <OriensLogo className="h-10 w-10" title="Oriens" />
      <p className="text-sm font-medium text-primary">Erro 404</p>
      <h1 className="text-4xl font-bold tracking-tight">
        Página não encontrada
      </h1>
      <p className="max-w-md text-muted-foreground">
        O endereço que você abriu não existe ou foi movido.
      </p>
      <Button asChild className="mt-2">
        <Link to="/">Voltar para o início</Link>
      </Button>
    </div>
  );
};

export default NotFound;
