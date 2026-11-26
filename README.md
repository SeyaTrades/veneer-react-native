# Veneer Room Planner

[Open the room planner](https://seyatrades.github.io/veneer-room-planner/)

Will a sofa fit next to your table? Pick a room in **Studio**, tap a piece of furniture, and drag it into place. Switch from **Top Plan** to **Wall** to see how it looks from the side. The total at the top uses sample prices in pesos.

If you want a room to start with, open **Discover → Lookbooks** and tap **Remix** on one you like. To keep your layout, open **Account**, tap **Use demo account**, then go back to **Studio** and tap **Save**. Your saved rooms stay in the browser or on the device where you made them.

## Run it on your computer

Veneer uses React Native and Expo. Install Node.js 24.3 or later in the 24.x series, then run these commands in the project folder.

```sh
npm ci
npm run web
```

Use `npm start` to run it with Expo Go for SDK 58. Run `npm test` to check the room sizes, furniture placement, prices, and saved rooms.

## Update the website

In PowerShell, run the commands below to build a copy for GitHub Pages.

```powershell
$env:VENEER_PAGES = "1"
npx expo export --platform web
Remove-Item Env:VENEER_PAGES
```

Copy the contents of `dist` to the [website repo](https://github.com/SeyaTrades/veneer-room-planner). Keep its `.nojekyll` file and font licenses when you update it.
