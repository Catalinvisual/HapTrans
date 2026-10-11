'use client';
import React, { useEffect, useRef } from 'react';
import styles from './Reveal.module.css';

type RevealProps = {
  children: React.ReactNode;
  variant?: 'up' | 'fade' | 'zoom' | 'left' | 'right';
  delay?: number;
  className?: string;
  stretch?: boolean;
  as?: keyof React.JSX.IntrinsicElements;
};

let sharedObserver: IntersectionObserver | null = null;
const observerCallbacks = new Map<Element, () => void>();

function getSharedObserver(): IntersectionObserver | null {
  if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return null;
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const cb = observerCallbacks.get(entry.target);
            if (cb) {
              cb();
              observerCallbacks.delete(entry.target);
              sharedObserver?.unobserve(entry.target);
            }
          }
        });
      },
      { threshold: 0.01, rootMargin: '0px 0px 80px 0px' }
    );
  }
  return sharedObserver;
}

const Reveal = ({
  children,
  variant = 'up',
  delay = 0,
  className = '',
  stretch = false,
  as: Tag = 'div',
}: RevealProps) => {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = getSharedObserver();
    if (!observer) {
      node.classList.add(styles.isVisible);
      return;
    }
    observerCallbacks.set(node, () => {
      node.classList.add(styles.isVisible);
    });
    observer.observe(node);
    return () => {
      observerCallbacks.delete(node);
      observer?.unobserve(node);
    };
  }, []);

  const TagAny = Tag as React.ElementType;

  return (
    <TagAny
      ref={ref as React.Ref<HTMLElement>}
      className={`${styles.reveal} ${styles[variant]} ${stretch ? styles.stretch : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </TagAny>
  );
};

export default Reveal;