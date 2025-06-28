# Copilot Instructions for CLOSE PWA

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
CLOSE is a Progressive Web App (PWA) designed for long-distance couples to stay emotionally connected through a shared digital widget-like experience.

## Technology Stack
- **Frontend**: Next.js 14 with App Router (JavaScript)
- **Styling**: Tailwind CSS
- **Backend/Database**: Firebase (Firestore for real-time data)
- **Authentication**: Firebase Auth
- **Push Notifications**: Firebase Cloud Messaging (FCM)
- **PWA**: next-pwa for service worker and manifest
- **Hosting**: Firebase Hosting

## Key Features
1. **Room System**: Couples create/join rooms with custom names and passwords
2. **Real-time Syncing**: Shared photos, emojis, and status updates
3. **Ping System**: Send instant notifications to partner
4. **PWA Functionality**: Offline support, installable, native-like experience
5. **Mobile-first Design**: Responsive, emotional, and intimate UI/UX

## Code Guidelines
- Use functional components with React hooks
- Implement real-time Firebase listeners for live updates
- Follow mobile-first responsive design principles
- Use Tailwind CSS for styling with warm, soft color palette
- Implement proper error handling and loading states
- Ensure offline functionality with service worker caching
- Use Firebase security rules to protect room data
- Implement proper PWA features (manifest, service worker, installable)

## File Structure
- `/src/app` - Next.js App Router pages
- `/src/components` - Reusable React components
- `/src/lib` - Firebase configuration and utility functions
- `/public` - Static assets including PWA icons
- Root files: manifest.json, service worker files

## Design Principles
- Emotional and intimate design language
- Soft gradients and warm colors
- Smooth animations and transitions
- Clear typography and generous spacing
- Accessibility considerations
- Dark mode support (optional)
