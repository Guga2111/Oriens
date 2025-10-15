import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type AutocompletePrediction = google.maps.places.AutocompletePrediction;
type PlaceResult = google.maps.places.PlaceResult;
type PlacesServiceStatus = google.maps.places.PlacesServiceStatus;

interface LocationInputProps {
  isLoaded: boolean;
  onPlaceSelect: (place: { address: string; latitude: number; longitude: number; }) => void;
}

export function LocationInput({ isLoaded, onPlaceSelect }: LocationInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<AutocompletePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const sessionToken = useRef<google.maps.places.AutocompleteSessionToken | undefined>();

  useEffect(() => {
    if (isLoaded && window.google) {
      autocompleteService.current = new window.google.maps.places.AutocompleteService();

      placesService.current = new window.google.maps.places.PlacesService(document.createElement('div'));
      sessionToken.current = new window.google.maps.places.AutocompleteSessionToken();
    }
  }, [isLoaded]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    if (value.length > 2 && autocompleteService.current) {
      autocompleteService.current.getPlacePredictions(
        { input: value, sessionToken: sessionToken.current, componentRestrictions: { country: 'br' } },
        (predictions, status) => {
          if (status === 'OK' && predictions) {
            setSuggestions(predictions);
          } else {
            setSuggestions([]);
          }
        }
      );
    } else {
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (placeId: string) => {
    setIsLoading(true);
    setSuggestions([]); 
    
    if (!placesService.current) return;

    placesService.current.getDetails(
      { placeId: placeId, fields: ['formatted_address', 'geometry.location'], sessionToken: sessionToken.current },
      (place, status) => {
        setIsLoading(false);
        if (status === 'OK' && place) {
          if (place.formatted_address) {
            setInputValue(place.formatted_address); 
          }
          if (place.geometry?.location) {
            onPlaceSelect({
              address: place.formatted_address || '',
              latitude: place.geometry.location.lat(),
              longitude: place.geometry.location.lng(),
            });
          }

          sessionToken.current = new window.google.maps.places.AutocompleteSessionToken();
        }
      }
    );
  };

  if (!isLoaded) {
    return <Input disabled placeholder="Carregando mapa..." />;
  }

  return (
    <div className="relative">
      <Input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={() => setTimeout(() => setSuggestions([]), 200)}
        placeholder="Digite um endereço..."
        disabled={isLoading}
      />
      {isLoading && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
      
      {suggestions.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-background border border-border rounded-md shadow-lg z-50">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.place_id}
              type="button"
              onMouseDown={() => handleSuggestionClick(suggestion.place_id)}
              className="w-full text-left p-2 hover:bg-muted text-sm"
            >
              {suggestion.description}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}