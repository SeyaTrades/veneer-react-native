# Veneer for React Native

**[Open Veneer Room Planner](https://veneer-room-planner.heroicmulberry128.chatgpt.site)**

Veneer is a room planner built with React Native and Expo SDK 58 for Android, iOS, and the web. This project recreates the Veneer Flutter app with the same five room presets, 20 furniture products, 40 sample store listings, and seven starter lookbooks.

## Run the app

Use Node.js 24.3 or later in the 24.x series. Open a terminal in the folder containing this README and run:

```sh
npm ci
npm start
```

Open the QR code in an Expo Go version that supports SDK 58 to use the app on a phone. The computer and phone should be on the same network. For a browser demonstration, run `npm run web`. The browser uses the same React Native screens and planner logic. A wide landscape window shows the navigation rail and properties sidebar.

## Try it in class

1. In **Studio**, tap a furniture card to place it. Drag the selected piece, tap **Turn**, or enter an exact wall clearance using **Position**. On desktop, use **Properties** in the sidebar.
2. Switch from **Top Plan** to **Wall** and try the four compass directions. Toggle **Half Depth** and **Full** to change which items appear.
3. Tap **Save** as a guest, choose **1-Tap Demo Account**, and return to Studio to name and save the room. Turn on **Share to Lookbooks** to include it in Discover.
4. Open **Storage** and choose **Shop List** to see quantities, the cheapest split-store total, and the one-stop IKEA PH total.
5. Open **Discover → Lookbooks**, choose **Warm Reading Corner**, and tap **Remix**. The new draft contains six items and has an estimated cost of ₱24,126.

## Data and artwork

As in the Flutter project, sign-in and registration are local classroom demos. Saved rooms, the active profile, and planner preferences persist on the device or in the browser profile. Each app keeps its own storage. Shared lookbooks are visible to profiles using the same installation. The store links and sample prices come from the original catalog.

The React Native interface uses React components, native views, touch responders, and AsyncStorage. The bundled furniture illustrations and room backgrounds were exported from the original painters. The app runs independently of Flutter.

## Source and checks

- `App.js` handles navigation and persistence.
- `src/Studio.js`, `src/Screens.js`, and `src/Dialogs.js` contain the editor, galleries, account, and shopping interfaces.
- `src/Stage.js` renders the interactive floor plan and wall elevations.
- `src/planner.js` handles units, projection, furniture bounds, and shopping estimates. `src/state.js` handles editing and saved rooms.
- `src/catalog.json` contains the presets, catalog, retailer listings, and lookbooks.
- `assets/` contains the original illustrations, launcher artwork, Roboto, and Material Icons. The font license files are included there.

Run `npm test` for the seven planner and persistence tests. Run `npx expo export --platform all` to generate the Android and iOS JavaScript bundles and the browser build. Native device testing requires a compatible phone or simulator.

