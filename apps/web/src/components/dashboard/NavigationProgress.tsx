'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function NavigationProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const prevPathname = useRef(pathname);
  const activeRef = useRef(false);

  const start = () => {
    if (activeRef.current) return;
    activeRef.current = true;
    setVisible(true);
    setWidth(8);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setWidth((w) => {
        const next = w + (88 - w) * 0.07;
        if (next >= 88) {
          clearInterval(intervalRef.current);
          return 88;
        }
        return next;
      });
    }, 180);
  };

  const complete = () => {
    if (!activeRef.current) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setWidth(100);
    setTimeout(() => {
      setVisible(false);
      setWidth(0);
      activeRef.current = false;
    }, 350);
  };

  // Complete when pathname changes (navigation finished)
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      complete();
    }
  }, [pathname]);

  // Intercept clicks on internal links
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const link = (e.target as Element).closest('a[href]');
      if (!link) return;
      const href = link.getAttribute('href') ?? '';
      // Only internal app routes
      if (href.startsWith('/') && !href.startsWith('//')) {
        start();
      }
    };
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 z-[9999] h-[2px] bg-blue-500 pointer-events-none"
      style={{
        width: `${width}%`,
        transition: width === 100 ? 'width 0.15s ease-out' : 'width 0.25s ease-out',
        opacity: width === 100 ? 0 : 1,
      }}
    />
  );
}
