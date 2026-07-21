let input = "";
for await (const chunk of process.stdin) input += chunk;
const parsed = JSON.parse(input);
const devices = Object.values(parsed.devices ?? {}).flat().filter((device) => device.isAvailable && /^iPhone/.test(device.name));
const selected = devices.find((device) => device.state === "Booted") ?? devices[0];
if (!selected) {
  process.stderr.write("No available iPhone Simulator is installed.\n");
  process.exit(1);
}
process.stdout.write(selected.udid);
