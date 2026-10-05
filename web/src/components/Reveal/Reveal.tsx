'use client';
import React, { useEffect, useRef, useState } from 'react';
import styles from './Reveal.module.css';

type RevealProps = {
  children: React.ReactNode;
  variant?: 'up' | 'fade' | 'zoom' | 'left' | 'right';
  delay?: number;
  className?: string;
  stretch?: boolean;
  as?: keyof React.JSX.IntrinsicElements;
};

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
    if (typeof IntersectionObserver === 'undefined') {
      requestAnimationFrame(() => node.classList.add(styles.isVisible));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            node.classList.add(styles.isVisible);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -48px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
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