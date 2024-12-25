'use client';

import { setCookie, getCookie } from 'cookies-next';

interface AppState {
  searchResults: any[];
  extractionResults: any[];
  apiKey?: string;
  language?: string;
}

const isExtension = typeof window !== 'undefined' && window.parent !== window;

export const saveState = (state: AppState) => {
  // Save to cookies for regular web usage
  setCookie('app-state', JSON.stringify(state), {
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/'
  });

  // If in extension, also save to extension storage
  if (isExtension) {
    window.parent.postMessage({
      type: 'SAVE_STATE',
      state
    }, '*');
  }
};

export const loadState = (): AppState | null => {
  // For extension, we'll still load from cookies initially
  // but will update from extension storage when available
  const state = getCookie('app-state');
  
  if (isExtension) {
    // Request state from extension
    window.parent.postMessage({
      type: 'REQUEST_STATE'
    }, '*');
  }

  if (state) {
    try {
      return JSON.parse(state as string);
    } catch {
      return null;
    }
  }
  return null;
};

export const clearState = () => {
  // Clear cookies
  setCookie('app-state', '', {
    maxAge: 0,
    path: '/'
  });

  // If in extension, also clear extension storage
  if (isExtension) {
    window.parent.postMessage({
      type: 'SAVE_STATE',
      state: null
    }, '*');
  }
};