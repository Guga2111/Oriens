import { useMemo, useCallback, useEffect } from 'react'; 

export const useSound = (src: string) => {

  const audio = useMemo(() => new Audio(src), [src]);

  useEffect(() => {
    audio.load();
  }, [audio]); 

  const play = useCallback(() => {
    audio.currentTime = 0;

    audio.play().catch(e => {
      console.error("Error playing sound:", e);
    });
  }, [audio]);

  return play;
};