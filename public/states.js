// Shared helper: fills a <select> with Indian states and union territories
// from /api/states, grouped by type. Returns the state list.

async function loadStateOptions(select, preferred) {
  const response = await fetch("/api/states");
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "States could not load");

  const groups = [
    ["States", data.states.filter(s => s.type === "state")],
    ["Union territories", data.states.filter(s => s.type === "ut")],
  ];

  select.replaceChildren(
    ...groups.map(([label, states]) => {
      const group = document.createElement("optgroup");
      group.label = label;
      for (const s of states) {
        const option = document.createElement("option");
        option.value = s.name;
        option.textContent = s.name;
        group.appendChild(option);
      }
      return group;
    })
  );

  const wanted = data.states.some(s => s.name === preferred)
    ? preferred
    : data.default;
  select.value = wanted;
  return data.states;
}
