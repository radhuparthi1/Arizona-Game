# Saguaro Hop

First-person Arizona desert hopper. You are a walking saguaro in cowboy country: jump tumbling weeds, snatch turquoise gold, bounce barrel cactus, and do not get rattlesnake bit.

## Play now

Open this in a desktop or mobile browser (HTTPS, so it actually runs):

**https://raw.githack.com/radhuparthi1/Arizona-Game/cursor/arizona-cactus-hop-a9ab/index.html**

GitHub itself only shows the source. That link serves the live game.

Or run it locally:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`. A network connection is needed once so [Three.js](https://threejs.org/) can load from the CDN.

## Controls

Click **DROP INTO THE DESERT**. Drag on the sand to look. You do not need mouse-lock.

| Input | Action |
| --- | --- |
| **WASD** or on-screen stick | Mosey |
| **Drag** / mouse | Look |
| **Q / E** or arrow keys | Turn |
| **Space** or **JUMP** | Jump / double jump |
| **Shift** or **BOOT IT** | Sprint (drinks the canteen) |
| **P** | Pause |
| **M** | Mute |
| **R** | Restart after a wipeout |

## The wash

- **Gold coins & turquoise nuggets** — score, with a combo if you keep stringing pickups
- **Tumbleweeds** — jump them or eat dust
- **Barrel cactus** — land on one for a super bounce
- **Saguaros** — scenery, but the spines bite if you hug them
- **Rattlesnakes** — hop over or give them a wide berth
- **Canteens** — fill up before the sun cooks you
- **Chili peppers** — boot it
- **Night-blooming cereus** — extra life
- **Mesas** — climb for sky coins

Territory record is stored in this browser (`saguaro-hop-best`).
