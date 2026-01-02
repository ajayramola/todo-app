import { createTRPCReact } from '@trpc/react-query';
// This import points to your server folder to get the Types
// Make sure your server folder is next to the client folder
import type { AppRouter } from '../../server/src/index'; 

export const trpc = createTRPCReact<AppRouter>();