# Vital-X user guide

Vital-X has three screens. They share the same data and each has its own URL, so they can be
opened on separate screens or switched from the header:

| Screen | URL | For |
|---|---|---|
| **Ground Control** | `#/ground` (default) | The medical team on Earth: the whole crew, history, body cam, records, assignments |
| **Crew Display** | `#/crew` | The tablet of one astronaut: big buttons usable with gloves |
| **Wrist** | `#/wrist` | A watch-size screen: one idea per screen, no small targets |

> **Demo note.** Every reading is **simulated** in the browser: values stay close to each
> astronaut's baseline with small variations, and now and then one drifts briefly into the caution
> band before settling back. The crew device of the selected astronaut uploads its readings to
> Azure Cosmos DB, and Ground Control reads them back, so a crew device and Ground on **separate
> devices** share that astronaut's data. Astronauts with no device reporting stay simulated on
> Ground. To show all three screens in step, you can also use **one tab** and switch views from the
> header.

## Status colours

| Colour | Ground label | Crew label | Meaning |
|---|---|---|---|
| Green | Nominal | Normal | Inside the range for this environment and activity |
| Amber | Caution | Watch | Out of the normal range, not critical |
| Red, blinking | Critical | Alert | Confirmed emergency (3 consecutive critical samples, or a combined rule) |

Ranges change with the context: a heart rate of 150 bpm is normal during an intense EVA and an
alarm at rest. When a range has been adjusted, the card says which activity it was adjusted for.

---

## Ground Control (`#/ground`)

**Top of the page**

- **Header:** view switch (Ground Control, Crew Display, Wrist), UTC clock and the black-box
  indicator of the device currently worn: *live*, *no link · N stored onboard*, *synced N to
  ground*, *cloud not configured* or *cloud unreachable*.
- **Environment tabs:** Pre-Flight, Spacecraft, Station, Planetary Base, Post-Flight. Selecting an
  environment focuses an astronaut working there.
- **Crew roster:** every astronaut with their status and task. Selecting one opens the environment
  they are in.
- **Data source bar:** **Azure** (default) or **Simulation**. With Azure, Ground uses the data each
  crew device stored in the cloud and says how many astronauts are reporting; the others stay
  simulated. If Azure cannot be reached it falls back to the simulation on its own. **Simulation**
  ignores Azure (fallback for a presentation).
- **Link status bar:** route (fiber, TDRS, Deep Space Network, lunar relay), delay, and whether the
  link is up (**AOS**) or lost (**LOS**). During LOS it shows how many samples are waiting onboard;
  when the link returns it shows how many were synced. **Simulate link loss / Restore link** holds
  the link down for the demo.

**Tabs**

| Tab | What it shows |
|---|---|
| **Live** | Key readings (large cards) and other readings for the selected astronaut. The tab row says where they come from: *From device via Azure · Ns ago* (and *black box* if the last record arrived late) or *Simulated*. Below the readings: **Azure reception** and **Risk simulation** (see next sections). |
| **History** | Charts of the recent samples of each metric with their ranges. |
| **Body Cam** | Live video on high-bandwidth links, a still frame every few seconds on low-bandwidth links, *No signal* during LOS. The feed is simulated unless a stream URL is configured. |
| **Records** | Completed sessions per environment: who did which task, when, and the summary of their readings. |
| **Assignments** | Each mission and its phase. Assign a task to an astronaut (only tasks allowed by the phase), see the task the crew announced next, and **Advance crew to …** the next phase. Spacewalks are assigned in pairs. |
| **Environment** | Conditions of the environment (temperature, humidity, gravity, pressure, O₂, background radiation), the 30-day radiation dose against its limit, and the NASA indicators with their hazard, rationale and countermeasure. |

**Azure reception** (Ground Control only). The last records of this astronaut's device in Azure:
when each was recorded and received, the delay, and how it was delivered:

| Delivery | Meaning |
|---|---|
| **Live** | Sent as soon as it was recorded |
| **Black box** | Recorded without a link and delivered later, when the link returned |

*Link when recorded* says why there was no link: **No network (real)** (the device was really
offline), **Link loss (simulated)** (*Simulate link loss*) or **Scheduled outage (simulated)** (a
planned LOS of the environment). Use it to check that the offline mode works.

**Risk simulation** (demo controls). Starts a situation on the selected astronaut's device. Each
one follows an event of the training data; readings ramp past their limits in about 15 seconds and
return to normal when you press **End …**:

| Not on EVA | On EVA |
|---|---|
| Cardiac emergency, Dehydration, Infection / fever, Sleep deprivation, Habitat hypoxia, Orthostatic intolerance, Solar particle event (not on Earth) | Cardiac emergency, Suit CO₂ failure, Suit pressure leak, Overexertion, Mild hypoxia |

**Enter readings** opens a form with the current values: change the ones you want to test and
**Apply readings**. Those values are held until you end them; the others keep following the
astronaut. Because the situation runs on the device, it reaches Ground the same way as real data.

**Critical alerts.** A confirmed emergency opens a red modal with the reading or combined rule
(for example *Possible suit failure*) and the crew instruction. With several alerts, the list
scrolls inside the modal and the page behind stays still. **Acknowledge** silences them for Ground
and opens the live vitals of the astronaut in trouble. If a reading becomes critical again later,
it alarms again.

---

## Crew Display (`#/crew`)

The tablet belongs to one astronaut (the one selected in Settings).

| Page | What it shows |
|---|---|
| **Vitals** | The four key readings for the current task, in plain words, and what to do if one is out of range. |
| **Activity** | The current task, **Change activity** (only tasks allowed in the mission phase) and the next activity to announce to Ground. Ground sees the announcement when the downlink delivers it. |
| **Crew** | The other astronauts of the same mission and their status. |
| **Log** | The astronaut's previous activities. |
| **Settings** (gear icon) | **Colours**, **Text size**, **This device is worn by** (demo only: a real device is paired to one astronaut) and **Simulate emergency** (a cardiac emergency; ends any running situation). |

**Colour themes**

| Theme | Use |
|---|---|
| **Auto** (default) | Follows the activity: Sunlight on EVA, Night during sleep or rest periods, Cabin otherwise |
| **Cabin** | Interior lighting |
| **Sunlight** | High contrast for direct sun, EVA, outdoors |
| **Night** | Dim amber, no blue light, for sleep periods |

Ground Control always uses the Cabin theme. The choice is kept on the device.

**Emergencies.** A red modal asks the astronaut to stop the current task and shows the instruction
to follow. **Acknowledge** silences it on the tablet and the wrist, and opens the Vitals page.

---

## Wrist (`#/wrist`)

One idea per screen. Change screens by **swiping**, pressing the **side button**, or with the
**← →** keys.

| Screen | What it shows |
|---|---|
| **Status** | Overall status, the key readings and the black-box state |
| **Activity** | Current task and next activity |
| **Crew** | Other crew on the mission |
| **Alerts** | Only appears while a reading is out of range |

An emergency turns the whole screen red and vibrates the device (where supported); the lower half
is the **OK** button. After OK, a *Do this now* screen shows how to stabilise and asks the astronaut
to tell Mission Control how they feel. It closes on its own after a countdown, or with a tap.

---

## Offline use and the black box

- The device worn by the selected astronaut records a snapshot every 15 seconds, with or without a
  link.
- Without a link (no network, or LOS for the astronaut's environment) the snapshots stay on the
  device. When the link returns they are sent in recording order, so there are no gaps.
- Each record notes the link state when it was recorded. Ground → *Azure reception* shows which
  records arrived live and which came from the black box.
- If the cloud is not configured, the indicator says so and the data stays onboard.
- After a new version is published, reload the app once or twice: the installed app keeps the
  previous version until then.
- Installed as an app (browser menu → *Install*), Vital-X opens without a connection. Offline
  support needs the production build; it is off in `npm run dev`.

## Suggested demo flow

1. Open the Crew Display on a phone (Settings → *This device is worn by* → pick an astronaut) and
   Ground Control on a laptop. After about 15 s Ground shows that astronaut *From device via Azure*.
2. Ground → *Risk simulation* → **Dehydration** (or **Suit CO₂ failure** on EVA): the readings
   ramp up, the alert opens, **Acknowledge** leads to the live vitals. **End …** brings them back.
3. Put the phone in airplane mode for a minute, then back online: *Azure reception* shows the
   records as **Black box · No network (real)**. *Simulate link loss* does the same as a simulated
   outage.
4. *Assignments* → assign a task, advance a mission phase. *Records* shows the finished session.
5. *Body Cam* on the station (video) and on the spacecraft (snapshots).
6. Crew Display → Vitals → Activity → Crew → Settings → Colours.
7. Wrist → *Simulate emergency* → **OK** → *Do this now*.
