import type { OS1Api } from '../preload/index';

declare global {
  interface Window {
    os1: OS1Api;
  }
}

export {};
