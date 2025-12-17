# NatureUP Health

A voice-first mobile health app focused on personalized outdoor excursions and nature therapy.

## Features

- AI-powered health coaching
- Personalized nature therapy routes
- Real-time weather integration
- AllTrails integration for curated hiking trails
- OpenStreetMap integration for nature spots

## Setup

### Environment Variables

The app requires the following Supabase secrets to be configured:

```bash
OPENAI_API_KEY=your_openai_api_key
ALLTRAILS_API_TOKEN=your_alltrails_bearer_token
```

### AllTrails Integration

The app integrates with AllTrails to provide curated hiking trail recommendations. To enable this:

1. Obtain an AllTrails API bearer token
2. Set the token as a Supabase Edge Function secret:
   ```bash
   supabase secrets set ALLTRAILS_API_TOKEN=your_token
   ```

The AllTrails integration provides:
- Trail difficulty ratings (Easy, Moderate, Hard)
- Trail length and elevation gain
- User ratings (1-5 stars)
- Estimated completion times
- Nearby trail recommendations

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
