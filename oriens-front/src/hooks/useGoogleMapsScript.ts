import { useState, useEffect } from 'react';

interface UseGoogleMapsScriptOptions {
  apiKey: string;
  libraries: string[];
}

const SCRIPT_ID = 'google-maps-script';

export function useGoogleMapsScript(options: UseGoogleMapsScriptOptions) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (window.google && window.google.maps) {
      setIsLoaded(true);
      return;
    }

    const existingScript = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      const handleLoad = () => setIsLoaded(true);
      const handleError = () => setError(new Error('Falha ao carregar o script do Google Maps.'));
      existingScript.addEventListener('load', handleLoad);
      existingScript.addEventListener('error', handleError);
      return () => {
        existingScript.removeEventListener('load', handleLoad);
        existingScript.removeEventListener('error', handleError);
      };
    }

    // Se não existe, cria o script.
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${options.apiKey}&libraries=${options.libraries.join(',')}&callback=Function.prototype`;
    script.async = true;
    script.defer = true;

    const handleLoad = () => setIsLoaded(true);
    const handleError = () => setError(new Error('Falha ao carregar o script do Google Maps.'));

    script.addEventListener('load', handleLoad);
    script.addEventListener('error', handleError);

    document.head.appendChild(script);

    return () => {
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
    };
  }, [options.apiKey, options.libraries]);

  return { isLoaded, loadError: error };
}