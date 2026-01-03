import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../server/src/index'; // Adjust path to your server code

export const trpc = createTRPCReact<AppRouter>();

// CHANGE THIS to your computer's IP if testing on real phone
export const API_URL = 'http://10.0.2.2:4000'; 
export const WS_URL = 'ws://10.0.2.2:4000';