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
