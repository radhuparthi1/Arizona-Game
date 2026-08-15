# Saguaro Hop

First-person Arizona desert hopper. You are a walking saguaro in cowboy country: jump tumbling weeds, snatch turquoise gold, bounce barrel cactus, and do not get rattlesnake bit.

## Play

Open `index.html` in a modern browser, or serve the folder:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

A live connection is needed once so the game can load [Three.js](https://threejs.org/) from the CDN.

## Controls

| Input | Action |
| --- | --- |
| **WASD** | Mosey |
| **Mouse** | Look |
| **Space** | Jump / double jump |
| **Shift** | Sprint (drinks the canteen) |
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
