# NatureUP Health

A voice-first mobile health app focused on personalized outdoor excursions and nature therapy.

## Features

- AI-powered health coaching
- Personalized nature therapy routes
- Real-time weather integration
- OpenStreetMap integration for nature spots (parks, trails, viewpoints)

## Setup

### Environment Variables

The app requires the following Supabase secrets to be configured:

```bash
OPENAI_API_KEY=your_openai_api_key
```

### Security Configuration

Complete these additional security settings in the Supabase Dashboard:

1. **Enable Leaked Password Protection**
   - Go to Authentication > Settings
   - Enable "Check for leaked passwords (HaveIBeenPwned)"
   - This prevents users from using compromised passwords

2. **Auth Database Connection Strategy**
   - Go to Project Settings > Database > Connection Pooling
   - Set Auth server to use percentage-based connection allocation
   - Recommended: 5-10% of total connections
   - This ensures Auth scales with instance size

## Development

```bash
npm install
npm run dev
```

## Deployment

Deploy to Expo:
```bash
eas build --platform ios
eas submit --platform ios
```
