import { NextConfig } from 'next';

const config: NextConfig = {
 env: {
   GOOGLE_API_KEY: process.env.GOOGLE_API_KEY!,
   GOOGLE_SEARCH_ENGINE_ID: process.env.GOOGLE_SEARCH_ENGINE_ID!
 },
 eslint: {
   ignoreDuringBuilds: true,
 },
 typescript: {
   ignoreBuildErrors: true,
 }
};

export default config;