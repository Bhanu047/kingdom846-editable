// Known starting passwords for the seeded accounts, so the tests can sign in.
// The server reads these from the environment; production sets its own (or
// lets the server generate them), so nothing here works against the live site.
export const PW = {
  sparta: 'test-sparta-pw',
  shoni: 'test-shoni-pw',
  lovelykhaos: 'test-lovelykhaos-pw',
  ladycharlotte: 'test-ladycharlotte-pw',
  dunngeon: 'test-dunngeon-pw',
  panini: 'test-panini-pw',
  anonymous: 'test-anonymous-pw',
  abstraction: 'test-abstraction-pw',
  shiba: 'test-shiba-pw',
  bubbles: 'test-bubbles-pw',
}
for (const [user, pw] of Object.entries(PW)) process.env[`SEED_PASSWORD_${user.toUpperCase()}`] = pw
