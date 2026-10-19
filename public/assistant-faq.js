// Suggested questions with predefined answers for the Disaster Assistant.
// `q` is the full question (what gets asked), `label` the short button text.
// These are answered instantly without calling the AI service.

const NUMBERS =
  "Emergency numbers: 112 (all emergencies), 101 (fire), 108 (ambulance), " +
  "1070 (state disaster control room), 1077 (district disaster control room).";

const FAQ = [
  {
    category: "Floods",
    items: [
      {
        label: "How do I prepare an emergency kit?",
        q: "How can I prepare an emergency kit for a flood?",
        a: `Pack a waterproof bag that is easy to carry, and keep it somewhere high and easy to reach:

• Water: at least 3 litres per person per day, for 3 days
• Dry food: chira, biscuits, roasted gram, packaged food (3 days)
• Medicines: regular prescriptions, ORS packets, first-aid kit, water-purification tablets
• Documents: Aadhaar, ration card, bank papers, certificates — sealed in plastic bags
• Torch, spare batteries, power bank and a whistle to signal for help
• Basic mobile phone with emergency numbers saved
• Clothes, a raincoat, sturdy footwear, a blanket and a plastic sheet
• Soap, sanitiser and sanitary items
• Some cash in small notes
• Needs for babies, elderly people and pets

Check the kit before every monsoon (by April–May in Assam) and replace expired food and medicines.

Emergency numbers: 112 (all emergencies), 1070 (state disaster control room), 1077 (district disaster control room).`,
      },
      {
        label: "What should I do during a flood warning?",
        q: "What should I do if my area is under a flood warning?",
        a: `If your area is under a flood warning:

1. Stay calm and follow official instructions from ASDMA, the district administration and local police.
2. Keep your emergency kit ready, and charge your phone and power bank.
3. Move important items, documents and food to the highest place in your home.
4. Turn off electricity and gas at the mains if water is likely to enter.
5. Find out where the nearest relief camp or high ground is, and the safest route to reach it.
6. Leave early if authorities ask you to — do not wait for the water to rise.
7. Help children, elderly people, people with disabilities and pregnant women first.
8. Never cross flooded roads or bridges on foot or by vehicle.
9. Do not return home until officials say it is safe.

Check verified alerts at asdma.assam.gov.in. Emergency numbers: 112, 1070 (state), 1077 (district).`,
      },
      {
        label: "Water is entering my house",
        q: "What should I do if flood water starts entering my house?",
        a: `If flood water starts entering your home:

1. Switch off the main electricity supply and the gas cylinder regulator — only if you can do it without standing in water.
2. Move family members, especially children and elderly people, to the highest floor or the roof.
3. Take your emergency kit, phone, drinking water and medicines with you.
4. Do not touch electrical appliances or switches while wet.
5. If the water keeps rising and you are told to evacuate, leave by the safest route — never walk through fast-flowing water.
6. If you are trapped, stay on the highest point, signal with a torch, whistle or bright cloth, and call 112.

Do not go back down to save belongings. Your life is more important.

${NUMBERS}`,
      },
      {
        label: "Is my car safe in floodwater?",
        q: "What should I do if I am in a vehicle during a flood?",
        a: `Vehicles are not safe in floodwater:

• Never drive into flooded roads or underpasses — 30 cm of moving water can float a car, and you cannot see if the road underneath has washed away.
• Turn around and take another route, or wait on high ground.
• If water rises around your stopped car, unbuckle, unlock the doors and get out immediately to higher ground.
• If the door will not open, lower or break the side window (use the headrest's metal rods or a window breaker) and climb out.
• If you are swept away inside the car, climb onto the roof and call for help.

Do not try to push a stalled car through water. Call 112 for rescue.`,
      },
      {
        label: "Returning home after a flood",
        q: "How do I return home safely after a flood?",
        a: `Return only when authorities say it is safe. Then:

• Look for damage from outside first: cracks, leaning walls or a sagging roof mean you should not enter.
• Do not switch on electricity until an electrician has checked the wiring and appliances.
• Watch for snakes, insects and animals that may have entered the house.
• Wear gloves and boots while cleaning; floodwater carries sewage and chemicals.
• Throw away food, medicines and cosmetics that touched floodwater.
• Disinfect floors, walls and utensils with bleach solution and let the house dry with windows open.
• Photograph the damage before cleaning, for relief and insurance claims.
• Boil or purify drinking water until the supply is declared safe.`,
      },
      {
        label: "Safe drinking water after floods",
        q: "How can I make drinking water safe after a flood?",
        a: `Assume all well, tap and tank water is contaminated after a flood until officials say otherwise.

• Boil water at a rolling boil for at least 1 minute, then cool and store it in a clean covered container.
• If you cannot boil, use chlorine tablets or bleach as directed by health workers (usually 1 tablet per 20 litres; wait 30 minutes).
• Filter cloudy water through clean cloth before boiling or treating it.
• Use treated water for brushing teeth, washing food and making baby food too.
• Disinfect wells with bleaching powder before using them again.

Watch for diarrhoea, vomiting, fever or jaundice — signs of cholera, typhoid or hepatitis. Give ORS and see a doctor quickly.`,
      },
    ],
  },
  {
    category: "Heavy rain & landslides",
    items: [
      {
        label: "Heavy rainfall precautions",
        q: "What precautions should I take during heavy rainfall?",
        a: `During heavy rainfall:

• Stay indoors and avoid unnecessary travel.
• Never walk, swim or drive through flowing or flooded water — 15 cm of moving water can knock a person down, and 30 cm can sweep a car away.
• Stay away from rivers, drains, embankments and landslide-prone slopes, especially in hilly areas.
• Keep away from electric poles and fallen wires. Switch off the mains if water enters your house.
• Move valuables, documents and your emergency kit to a higher place.
• Keep your phone charged and follow weather updates from IMD and ASDMA.
• Drink boiled or purified water to avoid water-borne diseases.
• Watch for signs of a landslide: cracks in the ground, tilting trees or poles, or sudden muddy water.

If you are in immediate danger, call 112 and follow the instructions of local authorities.`,
      },
      {
        label: "Warning signs of a landslide",
        q: "What are the warning signs of a landslide?",
        a: `Watch for these signs, especially during or after heavy rain in hilly areas:

• New cracks in the ground, roads, walls or floors
• Trees, poles, fences or walls starting to tilt
• Doors and windows suddenly jamming
• Springs or seepage appearing where there was none, or streams suddenly turning muddy
• A sudden rise or fall in stream water levels
• Rumbling sounds, or rocks and soil falling from slopes

If you notice any of these, move away from the slope immediately to stable ground and warn your neighbours. Inform the district administration and call 112.`,
      },
      {
        label: "During a landslide",
        q: "What should I do during a landslide?",
        a: `During a landslide:

• Move quickly away from the path of the slide — sideways, not downhill.
• Get to high, stable ground away from slopes, streams and valleys.
• If you cannot escape, curl into a tight ball and protect your head.
• If you are driving, watch for collapsed roads, fallen rocks and mud; do not cross bridges over swollen streams.

After a landslide:
• Stay away from the slide area — more slides can follow.
• Check for injured or trapped people nearby without entering the slide area, and direct rescuers to them.
• Report broken power lines, roads and water pipes to authorities.

Call 112 for rescue.`,
      },
      {
        label: "Waterlogging in cities",
        q: "How do I stay safe during urban waterlogging?",
        a: `City floods are dangerous because of hidden hazards:

• Avoid walking through waterlogged streets — open manholes and drains cannot be seen.
• If you must walk, use a stick to test the ground ahead and stay away from electric poles and transformers.
• Do not drive through underpasses or deep water.
• Park vehicles on higher ground before heavy rain.
• Keep basement and ground-floor valuables raised; switch off power if water enters.
• Do not let children play in flood water.

Report open manholes and live wires to the municipal corporation. Call 112 in an emergency.`,
      },
    ],
  },
  {
    category: "Wildfires & forest fires",
    items: [
      {
        label: "A forest fire is near my village",
        q: "What should I do if a forest fire is spreading near my village?",
        a: `If a forest fire is approaching:

1. Call 101 (fire) and inform the local forest office and village panchayat.
2. Follow evacuation orders immediately — do not wait to see the flames.
3. Move people, especially children and elderly people, away from the direction the wind is blowing the fire.
4. Fires climb uphill fast — never escape uphill or into narrow valleys.
5. Close windows and doors, and move gas cylinders and fuel away from the house if there is time.
6. Wet the area around your home only if it is safe and you are not ordered to leave.
7. Wear cotton clothes, cover your nose and mouth with a wet cloth, and carry water.

Do not try to fight a large fire yourself. Leave early.`,
      },
      {
        label: "Protecting my home from fire",
        q: "How can I protect my home from a forest fire?",
        a: `Create a safety zone around your home before the fire season (in India, mostly February to June):

• Clear dry leaves, grass, pine needles and firewood for at least 10 metres around the house.
• Cut low tree branches and keep trees from touching the roof.
• Store firewood, hay and fuel away from the house.
• Keep the roof and gutters free of dry leaves.
• Keep buckets of water, sand, a hose and shovels ready.
• Make sure the access road is clear for fire vehicles.
• Plan two escape routes and a meeting point with your family.

Never burn dry leaves or crop residue near forests, especially on windy days.`,
      },
      {
        label: "Protection from wildfire smoke",
        q: "How do I protect my health from wildfire smoke?",
        a: `Smoke contains fine particles that harm the lungs and heart:

• Stay indoors with windows and doors closed.
• Wear an N95 or N99 mask outdoors; cloth and surgical masks give little protection.
• Avoid outdoor exercise and heavy work.
• Do not burn incense, mosquito coils or wood indoors.
• Keep inhalers and medicines for asthma, COPD and heart disease ready.
• Children, elderly people and pregnant women should be extra careful.

Get medical help quickly for breathing difficulty, chest pain, dizziness or a severe cough. Call 108.`,
      },
      {
        label: "Escaping a fire in the forest",
        q: "What should I do if I am trapped in a forest during a fire?",
        a: `If you are caught in a forest fire:

• Stay calm and move away from the fire, towards roads, rivers, rocky areas or already-burnt ground.
• Do not go uphill — fire spreads fastest uphill.
• Keep low to avoid smoke and cover your nose and mouth with a wet cloth.
• If you cannot escape, find a ditch or low ground with little vegetation, lie face down and cover yourself with soil or a wet blanket.
• Enter water (a pond or river) if one is nearby.
• Call 112 and share your location.`,
      },
      {
        label: "How do I report a forest fire?",
        q: "How do I report a forest fire?",
        a: `To report a forest fire:

• Call 101 (fire services) or 112 (national emergency).
• Inform the local forest office, range officer or beat guard, and the village panchayat.
• Give the exact location (village, landmark or GPS coordinates), how big the fire is, which way it is moving, and whether people or houses are at risk.

On the DisasterGuardian Disaster Map, select a detected wildfire and press "Report" to see the nearest fire stations and hospitals and a ready-to-send report message.`,
      },
    ],
  },
  {
    category: "Fire safety at home",
    items: [
      {
        label: "Fire breaks out at home",
        q: "What should I do if a fire breaks out in my home?",
        a: `If a fire breaks out at home:

1. Shout "Fire!" to warn everyone and get out quickly — do not stop to collect belongings.
2. Call 101 (fire) or 112 once you are outside.
3. Crawl low under smoke, where the air is cleaner.
4. Touch doors with the back of your hand before opening; if hot, use another way out.
5. Close doors behind you to slow the fire.
6. Never use the lift.
7. If trapped, block door gaps with wet cloth, open a window and signal for help.
8. Once out, stay out — never go back inside.

Only fight a small fire if it is safe and you have an extinguisher.`,
      },
      {
        label: "How to use a fire extinguisher",
        q: "How do I use a fire extinguisher?",
        a: `Remember PASS:

• P — Pull the safety pin.
• A — Aim the nozzle at the base of the fire, not at the flames.
• S — Squeeze the handle.
• S — Sweep from side to side until the fire is out.

Stand 2–3 metres away, with your back to an exit. Never use water on oil or electrical fires; use a CO₂ or dry powder extinguisher instead. If the fire grows or the room fills with smoke, leave immediately and call 101.`,
      },
      {
        label: "LPG gas leak",
        q: "What should I do if there is an LPG gas leak?",
        a: `If you smell gas:

• Do not switch any electrical switch on or off, and do not light a match or lighter.
• Turn off the cylinder regulator and the stove knobs.
• Open all doors and windows.
• Get everyone out of the house.
• Put the safety cap on the cylinder if you can do so safely.
• Call the LPG emergency helpline 1906 from outside the house, or your gas distributor.

If a fire starts, leave and call 101.`,
      },
      {
        label: "If your clothes catch fire",
        q: "What should I do if someone's clothes catch fire?",
        a: `STOP, DROP and ROLL:

• STOP — do not run; running fans the flames.
• DROP — lie down on the ground and cover the face with the hands.
• ROLL — roll over and over until the flames are out.

You can also smother the flames with a thick blanket or rug. Then cool the burn with clean running water for 20 minutes and call 108 for an ambulance.`,
      },
    ],
  },
  {
    category: "Earthquakes",
    items: [
      {
        label: "During an earthquake (indoors)",
        q: "What should I do during an earthquake if I am indoors?",
        a: `DROP, COVER and HOLD ON:

• DROP to your hands and knees.
• COVER your head and neck under a sturdy table or desk, or against an inside wall.
• HOLD ON until the shaking stops.

Also:
• Stay away from windows, glass, mirrors, almirahs and heavy objects that can fall.
• Do not run outside during the shaking, and never use the lift.
• If you are in bed, stay there and protect your head with a pillow.

After the shaking stops, leave the building carefully by the stairs and move to an open area.`,
      },
      {
        label: "Earthquake when outside or driving",
        q: "What should I do during an earthquake if I am outdoors or driving?",
        a: `If you are outdoors:
• Move to an open area away from buildings, trees, electric poles, walls and signboards.
• Drop to the ground and protect your head until the shaking stops.

If you are driving:
• Stop safely away from buildings, trees, bridges, flyovers and power lines.
• Stay inside the vehicle with your seat belt on until the shaking stops.
• Drive carefully afterwards — watch for cracked roads and damaged bridges.

In hilly areas, watch for landslides and falling rocks.`,
      },
      {
        label: "After an earthquake",
        q: "What should I do after an earthquake?",
        a: `After an earthquake:

• Expect aftershocks — drop, cover and hold on again if shaking returns.
• Check yourself and others for injuries; give first aid and call 108 for serious injuries.
• Leave damaged buildings and do not go back in until they are checked.
• Check for gas leaks, fire and damaged wiring. Do not light matches.
• Use the stairs, never the lift.
• Stay away from damaged walls, bridges and power lines.
• Listen to radio, TV or official alerts for instructions.
• Use your phone only for emergencies so the network stays free.`,
      },
      {
        label: "Making my home earthquake-ready",
        q: "How can I prepare my home for an earthquake?",
        a: `To prepare your home:

• Fix heavy furniture, almirahs, gas cylinders and water heaters to the wall.
• Keep heavy and breakable items on lower shelves.
• Identify safe spots in each room (under sturdy tables, against inside walls).
• Know how to turn off the gas, electricity and water.
• Keep an emergency kit and a family meeting point.
• Practise Drop, Cover and Hold On with your family.
• For new construction or repairs, follow the earthquake-resistant building codes (BIS IS 1893 and IS 4326) and use a qualified engineer — much of North-east India is in the highest seismic zone.`,
      },
      {
        label: "Trapped under debris",
        q: "What should I do if I am trapped under debris after an earthquake?",
        a: `If you are trapped:

• Do not light a match or lighter — there may be a gas leak.
• Do not move around or kick up dust.
• Cover your mouth and nose with cloth.
• Tap on a pipe or wall so rescuers can hear you, or use a whistle.
• Shout only as a last resort — shouting makes you inhale dust and tires you.
• If you have a phone, call 112 and send your location.

Stay calm and conserve your energy. Rescuers search buildings systematically.`,
      },
    ],
  },
  {
    category: "Cyclones",
    items: [
      {
        label: "What do cyclone warnings mean?",
        q: "What do IMD cyclone warning stages mean?",
        a: `The India Meteorological Department (IMD) issues cyclone warnings in stages:

• Pre-Cyclone Watch — a cyclone may form and threaten the coast (about 72 hours ahead).
• Cyclone Alert — bad weather is expected in about 48 hours. Start preparing.
• Cyclone Warning — bad weather is expected within about 24 hours. Be ready to evacuate.
• Post-Landfall Outlook — issued about 12 hours before landfall, for areas inland that will be affected after the cyclone crosses the coast.

Colour codes on warnings: yellow (be updated), orange (be prepared), red (take action). Follow IMD (mausam.imd.gov.in) and your state disaster authority.`,
      },
      {
        label: "Preparing before a cyclone",
        q: "How should I prepare before a cyclone arrives?",
        a: `Before a cyclone:

• Follow IMD warnings and evacuate when told — especially if you live near the coast or in a kutcha house.
• Know the nearest cyclone shelter and the route to it.
• Keep your emergency kit, documents, drinking water and medicines ready.
• Tie down or bring inside loose objects (tin sheets, pots, signboards).
• Close and board up windows; keep the doors on the windward side shut.
• Charge phones and power banks; keep a battery radio.
• Fishermen must not go to sea, and boats should be secured.
• Move cattle to safe, higher ground.`,
      },
      {
        label: "During a cyclone",
        q: "What should I do during a cyclone?",
        a: `During a cyclone:

• Stay indoors or in a cyclone shelter. Stay away from windows and doors.
• Switch off electricity and gas.
• If the building starts to collapse, protect yourself under a strong table or bed.
• Beware of the calm "eye" of the cyclone — the strong winds return from the opposite direction, so do not go outside.
• Do not go near the sea or rivers; storm surge can flood the coast quickly.
• Listen to the radio for official updates.

Call 112 if you need rescue.`,
      },
      {
        label: "After a cyclone",
        q: "What should I do after a cyclone?",
        a: `After the cyclone has passed:

• Wait for the official all-clear before leaving the shelter.
• Stay away from fallen electric poles, loose wires and damaged buildings.
• Do not walk or drive through flood water.
• Drink only boiled or treated water.
• Clear debris carefully and watch for snakes.
• Help injured people and call 108 for serious injuries.
• Report damage to the village or ward officer for relief.`,
      },
      {
        label: "What is a storm surge?",
        q: "What is a storm surge and how do I stay safe from it?",
        a: `A storm surge is a rise in sea level pushed onto the land by a cyclone's strong winds. It can flood coastal villages several kilometres inland within minutes and causes most cyclone deaths.

To stay safe:
• If you live in a low-lying coastal area, evacuate early when authorities ask — do not wait for the wind.
• Go to a cyclone shelter or a strong building on higher ground, well away from the sea.
• Never go to the beach to watch the waves.
• Do not return until officials announce it is safe.`,
      },
    ],
  },
  {
    category: "Heatwave",
    items: [
      {
        label: "Signs of heat stroke",
        q: "What are the signs of heat stroke and what is the first aid?",
        a: `Heat stroke is an emergency. Signs:
• Very high body temperature (above 40°C)
• Hot, red and dry or damp skin
• Confusion, slurred speech, fainting or seizures
• Fast pulse, headache, nausea

First aid:
1. Call 108 immediately.
2. Move the person to a cool, shaded place.
3. Remove extra clothing.
4. Cool them quickly: wet the body with cool water, fan them, and place wet cloths or ice packs on the neck, armpits and groin.
5. If they are conscious and can swallow, give small sips of water or ORS.

Do not give fluids to an unconscious person.`,
      },
      {
        label: "Staying safe in a heatwave",
        q: "How can I stay safe during a heatwave?",
        a: `During a heatwave:

• Drink water often, even if you are not thirsty. Use ORS, lassi, lemon water or buttermilk.
• Avoid going out between 12 noon and 3 pm.
• Wear light, loose cotton clothes and cover your head with a cap, umbrella or cloth.
• Avoid alcohol, tea, coffee and fizzy drinks, which dehydrate you.
• Keep your home cool: curtains or shades on sunny windows, open windows at night.
• Never leave children or pets in parked vehicles.
• Outdoor workers should take frequent breaks in the shade.

Seek medical help for dizziness, cramps, confusion or vomiting.`,
      },
      {
        label: "Heat safety for children & elderly",
        q: "How do I protect children and elderly people during a heatwave?",
        a: `Children, elderly people and the sick are most at risk:

• Make sure they drink water regularly — the elderly often do not feel thirst.
• Keep them indoors in the coolest room during the hottest hours.
• Dress them in light cotton clothes.
• Check on elderly neighbours who live alone at least twice a day.
• Watch for warning signs: sleepiness, confusion, dry mouth, less urine, high temperature.
• Keep medicines away from heat and ask a doctor whether any medicines increase heat risk.

Call 108 at the first sign of heat stroke.`,
      },
      {
        label: "Heat exhaustion vs heat stroke",
        q: "What is the difference between heat exhaustion and heat stroke?",
        a: `Heat exhaustion (serious, but treatable):
• Heavy sweating, cold and clammy skin
• Weakness, dizziness, headache, muscle cramps
• Nausea, fast and weak pulse
→ Move to a cool place, loosen clothes, sip water or ORS, and rest. Get medical help if it does not improve within an hour.

Heat stroke (life-threatening):
• Body temperature above 40°C
• Hot skin, confusion, fainting or seizures
→ Call 108 immediately and cool the person rapidly.

Heat exhaustion can turn into heat stroke, so act early.`,
      },
    ],
  },
  {
    category: "Thunderstorms & lightning",
    items: [
      {
        label: "Lightning safety outdoors",
        q: "How do I stay safe from lightning when I am outdoors?",
        a: `When thunder roars, go indoors.

• Go into a pucca building or a closed metal-roof vehicle.
• Do not shelter under isolated trees, in open sheds or near electric poles.
• Get out of water, fields and open grounds; stay away from wire fences and metal objects.
• If you cannot reach shelter, crouch low on the balls of your feet, feet together, head tucked and hands on your ears. Do not lie flat on the ground.
• Groups should spread out so that one strike does not hit everyone.

Lightning causes many deaths among farmers in India — stop fieldwork as soon as a storm approaches.`,
      },
      {
        label: "Lightning safety indoors",
        q: "How do I stay safe from lightning when I am indoors?",
        a: `Indoors during a thunderstorm:

• Stay away from windows, doors and verandas.
• Unplug TVs, computers and other appliances (before the storm, not during it).
• Do not use wired phones or chargers plugged into the wall.
• Avoid bathing, washing utensils or touching taps and plumbing — metal pipes conduct lightning.
• Do not lie on concrete floors or lean against concrete walls.

Wait 30 minutes after the last thunder before going outside.`,
      },
      {
        label: "First aid for a lightning victim",
        q: "What first aid should I give to someone struck by lightning?",
        a: `A person struck by lightning does not carry an electric charge — it is safe to touch them.

1. Call 108 immediately.
2. Check if they are breathing and have a pulse.
3. If not breathing, start CPR: push hard and fast in the centre of the chest (100–120 times a minute).
4. Check for burns at the entry and exit points, and for broken bones.
5. Keep them warm and still until help arrives.

Move the person to a safer place only if the storm is still active and it is safe to do so.`,
      },
      {
        label: "Lightning warning apps",
        q: "How can I get lightning and weather warnings on my phone?",
        a: `Useful official apps and services in India:

• Damini: Lightning Alert — lightning warnings for your location (Ministry of Earth Sciences).
• Mausam — IMD weather forecasts and warnings.
• Sachet — NDMA's official disaster alerts for your area.
• Meghdoot — weather advisories for farmers.

Also turn on emergency/government alerts in your phone's settings and follow your state disaster authority. Use the 30-30 rule: if thunder comes less than 30 seconds after lightning, take shelter, and wait 30 minutes after the last thunder.`,
      },
    ],
  },
  {
    category: "Cold wave",
    items: [
      {
        label: "Staying safe in a cold wave",
        q: "How can I stay safe during a cold wave?",
        a: `During a cold wave:

• Wear several layers of loose woollen clothes; cover your head, hands and feet.
• Eat regular hot meals and drink warm fluids. Avoid alcohol — it lowers body temperature.
• Stay indoors as much as possible, especially elderly people and infants.
• Never sleep with a coal angithi, sigri or kerosene heater burning in a closed room — it releases carbon monoxide, which can kill silently. Keep a window open.
• Check on homeless people and elderly neighbours, and inform local night shelters.
• Protect livestock with shelter and bedding.`,
      },
      {
        label: "Hypothermia and frostbite signs",
        q: "What are the signs of hypothermia and frostbite?",
        a: `Hypothermia (body getting too cold):
• Uncontrollable shivering, slurred speech, confusion, drowsiness, slow breathing
→ Move the person to a warm place, remove wet clothes, wrap them in blankets and give warm (not hot) drinks if conscious. Call 108.

Frostbite (common in high mountains):
• Numbness; white, greyish-yellow or waxy skin on fingers, toes, ears or nose
→ Warm the area slowly with body heat or lukewarm water. Do not rub it or use direct heat, and do not walk on frostbitten feet if avoidable.

Get medical help as soon as possible.`,
      },
    ],
  },
  {
    category: "Tsunami",
    items: [
      {
        label: "Natural warning signs of a tsunami",
        q: "What are the natural warning signs of a tsunami?",
        a: `Nature's warnings — act on them even without an official alert:

• A strong earthquake that makes it hard to stand, if you are near the coast
• The sea suddenly drawing back and exposing the sea floor
• A loud roar from the sea, like a train or aircraft

If you notice any of these, move immediately inland or to high ground. Do not wait for an official warning and never go to the beach to look.

In India, tsunami warnings are issued by INCOIS (Indian Tsunami Early Warning Centre, Hyderabad).`,
      },
      {
        label: "What to do in a tsunami",
        q: "What should I do if there is a tsunami warning?",
        a: `If there is a tsunami warning:

• Move immediately to high ground (at least 30 metres above sea level) or as far inland as possible (2–3 km).
• If you cannot get away, go to the upper floors of a strong concrete building.
• Go on foot if possible; roads get jammed.
• If you are on a boat at sea, stay in deep water.
• Stay away from rivers and streams that flow into the sea.
• A tsunami is a series of waves; the first may not be the largest. Wait for the official all-clear before returning.`,
      },
    ],
  },
  {
    category: "First aid & health",
    items: [
      {
        label: "How to do CPR",
        q: "How do I give CPR to an adult?",
        a: `If an adult collapses and is not breathing normally:

1. Make sure the area is safe, then call 108 (or ask someone to call) and get an AED if available.
2. Place the heel of one hand in the centre of the chest, the other hand on top.
3. Push hard and fast: about 5–6 cm deep, 100–120 times a minute. Let the chest rise fully between pushes.
4. If you are trained, give 2 rescue breaths after every 30 compressions. If not, keep doing hands-only compressions.
5. Continue until help arrives or the person starts breathing.

For drowning victims and children, rescue breaths are especially important. A first-aid course teaches CPR properly.`,
      },
      {
        label: "Snake bite first aid",
        q: "What is the first aid for a snake bite?",
        a: `Snake bites increase during floods. If someone is bitten:

DO:
• Keep the person calm and still — movement spreads venom.
• Keep the bitten limb still and at or below heart level, like a broken limb.
• Remove rings, bangles, watches and tight clothes near the bite.
• Note the time of the bite and take the person to a hospital with anti-snake venom (ASV) immediately. Call 108.

DO NOT:
• Cut the wound, suck out venom, or apply ice, herbs or chemicals.
• Tie a tight tourniquet.
• Try to catch or kill the snake (a photo from a safe distance helps).

Anti-snake venom is the only effective treatment, and it is available free at government hospitals.`,
      },
      {
        label: "Helping a drowning person",
        q: "How do I help a person who is drowning?",
        a: `Reach, throw, don't go:

• REACH with a stick, rope, dupatta or pole while you stay on land.
• THROW something that floats — an empty can, a tube or a plastic bottle.
• Do not jump in unless you are trained in water rescue — panicking people can drown their rescuers.

Once the person is out of the water:
1. Call 108.
2. If they are not breathing, start CPR with rescue breaths.
3. If breathing, turn them on their side so water can drain, and keep them warm.

Anyone rescued from drowning should be checked by a doctor, even if they seem fine.`,
      },
      {
        label: "Stopping heavy bleeding",
        q: "How do I stop heavy bleeding?",
        a: `To control heavy bleeding:

1. Protect yourself with gloves or a plastic bag if possible.
2. Press firmly on the wound with a clean cloth or bandage. Keep pressing.
3. If blood soaks through, add more cloth on top — do not remove the first layer.
4. Raise the injured part above heart level if no bone is broken.
5. Bandage firmly once the bleeding slows.
6. Do not pull out objects stuck in the wound; pad around them instead.

Call 108. Keep the person lying down and warm to prevent shock.`,
      },
      {
        label: "First aid for burns",
        q: "What is the first aid for burns?",
        a: `For burns:

1. Cool the burn under cool running water for 20 minutes.
2. Remove rings, bangles and clothing near the burn — unless stuck to the skin.
3. Cover loosely with clean cling film or a clean, non-fluffy cloth.
4. Give paracetamol for pain if needed.

DO NOT apply ice, butter, toothpaste, oil or turmeric, and do not burst blisters.

Call 108 or go to hospital for burns larger than the person's palm, burns on the face, hands, feet or genitals, deep burns, electrical or chemical burns, and any burn in a child or elderly person.`,
      },
      {
        label: "Preventing disease after floods",
        q: "How can I prevent diseases after a flood?",
        a: `Common diseases after floods are diarrhoea, cholera, typhoid, hepatitis A, leptospirosis, dengue and malaria. To prevent them:

• Drink only boiled or treated water and eat freshly cooked food.
• Wash hands with soap before eating and after using the toilet.
• Avoid wading in floodwater, especially with cuts or wounds (leptospirosis enters through the skin). Wear boots.
• Remove standing water around the house; use mosquito nets and repellents.
• Give ORS at the first sign of diarrhoea, especially to children.
• Keep vaccinations up to date.

See a doctor for fever, jaundice, bloody diarrhoea or muscle pain after flood exposure.`,
      },
    ],
  },
  {
    category: "Planning & preparedness",
    items: [
      {
        label: "Create an evacuation plan",
        q: "What should a family include in an emergency evacuation plan?",
        a: `A family evacuation plan should include:

• Meeting points: one near home, and one outside your area in case you get separated.
• Evacuation routes: at least two ways to reach high ground or the nearest relief camp.
• Contacts: a written list of family phone numbers and an out-of-area contact person.
• Responsibilities: who carries the emergency kit, who helps children, elderly or disabled members, and who looks after pets and livestock.
• Documents: copies of important papers kept in a waterproof bag.
• Medical needs: a list of medicines, allergies and health conditions for each person.
• Warning signals: how you will receive alerts (radio, TV, SMS, local announcements) and when you will leave.
• Practice: walk through the plan together at least once before every monsoon.

Save these numbers in every phone: 112 (all emergencies), 1070 (state disaster control room), 1077 (district disaster control room).`,
      },
      {
        label: "Emergency numbers in India",
        q: "What are the important emergency numbers in India?",
        a: `Important emergency numbers in India:

• 112 — National emergency number (police, fire, ambulance)
• 100 — Police
• 101 — Fire
• 108 — Ambulance and medical emergencies (102 in some states for pregnant women and children)
• 1070 — State disaster control room
• 1077 — District disaster control room
• 1906 — LPG gas leak emergency
• 1098 — Childline (children in need of care)
• 181 / 1091 — Women's helpline

Save them in every family member's phone and write them down in your emergency kit.`,
      },
      {
        label: "Official disaster alert apps",
        q: "Where can I get official disaster alerts in India?",
        a: `Official sources of disaster alerts:

• Sachet (sachet.ndma.gov.in and app) — NDMA's alerts for your location
• IMD / Mausam app (mausam.imd.gov.in) — weather, cyclone and heatwave warnings
• Central Water Commission (ffs.india-water.gov.in) — river flood forecasts
• INCOIS (incois.gov.in) — tsunami and ocean warnings
• Damini app — lightning warnings
• Your State Disaster Management Authority — for Assam, asdma.assam.gov.in
• All India Radio and Doordarshan during emergencies

Turn on government emergency alerts in your phone settings. Do not forward unverified messages on WhatsApp.`,
      },
      {
        label: "Keeping documents safe",
        q: "How can I keep my important documents safe during a disaster?",
        a: `Protect your documents before a disaster:

• Keep originals (Aadhaar, ration card, land papers, certificates, bank and insurance documents) in a sealed waterproof bag in your emergency kit.
• Store digital copies in DigiLocker (the Government of India app), which officials accept as valid.
• Email scanned copies to yourself or save them in cloud storage.
• Keep a written list of bank account, insurance policy and ID numbers.
• Photograph your house and valuables for damage claims.

If documents are lost, contact the district administration — relief camps often help with replacements.`,
      },
      {
        label: "Help for elderly & disabled people",
        q: "How do I prepare elderly people and people with disabilities for a disaster?",
        a: `Plan ahead for family members who need extra help:

• Keep at least 7 days of medicines, and copies of prescriptions.
• Pack assistive items: glasses, hearing aids, walking sticks, wheelchair, spare batteries.
• Arrange a "buddy" — a neighbour or relative who will help them evacuate.
• Inform the local ward or panchayat office and ASHA worker so they are on the rescue priority list.
• Plan an accessible evacuation route and shelter.
• Write down their medical conditions, doctor's number and emergency contacts and keep it with them.
• Practise the evacuation plan with them.`,
      },
      {
        label: "Protecting pets and livestock",
        q: "How can I protect my pets and livestock during a disaster?",
        a: `For animals:

• Identify higher ground or a raised platform where livestock can be moved early.
• Do not tie animals inside flood-prone sheds — they need to be able to escape.
• Store dry fodder, feed and water in a safe, raised place.
• Keep pets on a leash or in a carrier with an ID tag, food and water during evacuation.
• Keep vaccination records and get animals vaccinated after floods to prevent disease outbreaks.
• Contact the local veterinary hospital or animal husbandry department for help with injured or sick animals.`,
      },
    ],
  },
  {
    category: "Using DisasterGuardian",
    items: [
      {
        label: "How are fires and floods detected?",
        q: "How does DisasterGuardian detect wildfires and floods?",
        a: `DisasterGuardian uses free NASA satellite data:

• Wildfires: NASA FIRMS active-fire detections from the VIIRS instruments on the Suomi NPP, NOAA-20 and NOAA-21 satellites (about 375 m pixels, available within about 3 hours of each pass). Nearby detections are grouped, outlined into a fire perimeter, and a 12-hour spread forecast is made from wind, humidity and slope.
• Floods: the NASA VIIRS flood map (2-day composite). Flood pixels are grouped into flood zones and outlined, with a 12-hour outlook based on forecast rainfall and river discharge.

Choose any state or union territory on the Disaster Map to see its detections.`,
      },
      {
        label: "How accurate are the detections?",
        q: "How accurate are the satellite detections on the Disaster Map?",
        a: `Satellite detections are useful early warnings, but they are not confirmed incidents:

• Fires smaller than a pixel can be missed, and hot surfaces such as industrial sites can cause false detections.
• Clouds hide the ground. Floods under cloud cannot be seen, and the map shows how much of the area was cloud-covered.
• The flood map can confuse cloud shadows or terrain shadows with water.
• Spread forecasts are model estimates; real fire and flood behaviour can change quickly.

Always confirm with local authorities and official alerts (Sachet, IMD, your state disaster authority) before acting.`,
      },
      {
        label: "How do I report an incident?",
        q: "How do I report a fire or flood from the Disaster Map?",
        a: `On the Disaster Map:

1. Choose your state or union territory.
2. In the "Active incidents" list (or by clicking a fire or flood on the map), press "Report".
3. DisasterGuardian shows the nearest fire stations and hospitals with distances, phone numbers where available, and directions.
4. Call or send an SMS directly from the report window, or copy the ready-made report message with the exact coordinates.

DisasterGuardian does not alert services automatically — you make the call or send the message. In any emergency, call 112.`,
      },
    ],
  },
];
