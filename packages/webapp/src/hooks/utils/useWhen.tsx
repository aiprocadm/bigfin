import React from 'react';

export function useWhen(condition: any, callback: any) {
  React.useEffect(() => {
    if (condition) {
      callback();
    }
  }, [condition, callback]);
}

export function useWhenNot(condition: any, callback: any) {
  return useWhen(!condition, callback);
}
