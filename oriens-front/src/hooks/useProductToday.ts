import { useEffect, useState } from 'react';
import { productNow } from '@/lib/product-time';

export function useProductToday() {
  const [today, setToday] = useState(() => productNow().date);
  useEffect(() => {
    const update = () => setToday(productNow().date);
    const timer = window.setInterval(update, 1000);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', update); document.removeEventListener('visibilitychange', update); };
  }, []);
  return today;
}
