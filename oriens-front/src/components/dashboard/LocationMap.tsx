import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  InfoWindowF,
  DirectionsRenderer,
  DirectionsService,
} from "@react-google-maps/api";
import { Loader2, LocateFixed } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "../ui/button";
import { toast } from "@/hooks/use-toast";
import { Badge } from "../ui/badge";

interface LocationMapProps {
  lat: number;
  lng: number;
  taskTitle: string;
  taskSubtitle?: string;
  priorityVariant: string;
  taskPriority: string;
}

const containerStyle = {
  width: "100%",
  height: "400px",
};

export function LocationMap({
  lat,
  lng,
  taskTitle,
  taskSubtitle,
  priorityVariant,
  taskPriority,
}: LocationMapProps) {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script-map-card",
    googleMapsApiKey: import.meta.env.VITE_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  const [infoWindowVisible, setInfoWindowVisible] = useState(false);
  const [userLocation, setUserLocation] =
    useState<google.maps.LatLngLiteral | null>(null);
  const [directions, setDirections] =
    useState<google.maps.DirectionsResult | null>(null);
  const [isFindingLocation, setIsFindingLocation] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [travelDuration, setTravelDuration] = useState<string | null>(null);

  const taskLocation = { lat, lng };

  const mapOptions = useMemo<google.maps.MapOptions>(
    () => ({
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: "cooperative",
      draggable: true,
      scrollwheel: true,
    }),
    []
  );

  const onLoad = useCallback(
    (map: google.maps.Map) => {
      map.setCenter(taskLocation);
      map.setZoom(15);
      mapRef.current = map;
    },
    [taskLocation]
  );

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  const handleFindUserLocation = () => {
    setDirections(null);
    setTravelDuration(null);

    setIsFindingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          setIsFindingLocation(false);
          toast({ title: "Sua localização foi encontrada!" });
        },
        () => {
          setIsFindingLocation(false);
          toast({
            variant: "destructive",
            title: "Erro",
            description: "Não foi possível obter sua localização.",
          });
        }
      );
    }
  };

  const directionsCallback = useCallback(
    (
      result: google.maps.DirectionsResult | null,
      status: google.maps.DirectionsStatus
    ) => {
      if (status === "OK" && result) {
        setDirections(result);
        const route = result.routes[0];
        if (route && route.legs[0] && route.legs[0].duration) {
          setTravelDuration(route.legs[0].duration.text);
        }
      } else {
        console.error(`Erro ao buscar rotas: ${status}`);
      }
    },
    []
  );

  if (!isLoaded) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <GoogleMap
        mapContainerStyle={containerStyle}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={mapOptions}
      >
        {!directions && (
          <Marker
            position={taskLocation}
            onMouseOver={() => setInfoWindowVisible(true)}
            onMouseOut={() => setInfoWindowVisible(false)}
          >
            {infoWindowVisible && (
              <InfoWindowF position={taskLocation}>
                <div className="p-1">
                  <div className="flex justify-between gap-2">
                    <p className="font-bold text-lg">{taskTitle}</p>
                    <Badge variant={priorityVariant}>
                      {taskPriority}
                    </Badge>
                  </div>
                  {taskSubtitle && (
                    <p className="text-sm text-muted-foreground break-words">
                      {taskSubtitle}
                    </p>
                  )}
                </div>
              </InfoWindowF>
            )}
          </Marker>
        )}
        {userLocation && (
          <Marker
            position={userLocation}
            icon={{
              url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
            }}
          />
        )}
        {userLocation && !directions && (
          <DirectionsService
            options={{
              origin: userLocation,
              destination: taskLocation,
              travelMode: window.google.maps.TravelMode.DRIVING,
            }}
            callback={directionsCallback}
          />
        )}
        {directions && <DirectionsRenderer options={{ directions }} />}
      </GoogleMap>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
        {travelDuration && (
          <Badge variant="secondary" className="text-sm p-2">
            Tempo estimado: {travelDuration}
          </Badge>
        )}
        <Button onClick={handleFindUserLocation} disabled={isFindingLocation}>
          {isFindingLocation ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LocateFixed className="mr-2 h-4 w-4" />
          )}
          Calcular Rota a Partir da Minha Localização
        </Button>
      </div>
    </div>
  );
}
