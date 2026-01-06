
import { createTRPCReact } from '@trpc/react-query';

// 🔴 FIX: Cast to 'any' to stop TypeScript from complaining about missing types
export const trpc = createTRPCReact<any>() as any;

// 🔴 REPLACE WITH YOUR COMPUTER'S IP ADDRESS
const YOUR_IP = '192.168.1.30'; 

export const API_URL = `http://${YOUR_IP}:4000`;
export const WS_URL = `ws://${YOUR_IP}:4000`;