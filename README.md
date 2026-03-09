# SillyTavern-Mnemo-Search

Browse, search, and download character cards from [mnemo.studio](https://mnemo.studio) directly inside SillyTavern.

## Features

- Search characters by name with real-time results
- Sort by downloads, newest, recently updated, or alphabetically
- NSFW content toggle
- One-click character import into SillyTavern
- View character details, tags, spec version, and token counts
- Direct links to character pages on Mnemo

## Installation

### Via SillyTavern Extensions Menu

1. Open SillyTavern
2. Go to **Extensions** > **Install Extension**
3. Paste this URL:
   ```
   https://github.com/mnemo-studio/SillyTavern-Mnemo-Search
   ```
4. Click **Save**

### Manual Installation

1. Navigate to your SillyTavern installation's extensions directory:
   ```
   cd SillyTavern/data/default-user/extensions/third-party/
   ```
2. Clone this repository:
   ```
   git clone https://github.com/mnemo-studio/SillyTavern-Mnemo-Search
   ```
3. Restart SillyTavern

## Usage

After installation, you'll see a gradient **M** button in the top toolbar (next to the character import button). Click it to open the Mnemo search popup.

- **Search**: Type a character name in the search box
- **Sort**: Use the dropdown to change sort order
- **NSFW**: Toggle the checkbox to include/exclude NSFW characters
- **Import**: Hover over a card and click "Import" to download the character into SillyTavern
- **Tags**: Click a tag on any character to search for that tag

## Configuration

The extension works out of the box with the public Mnemo API. For authenticated features (favorites, recommendations), you can add a personal API token:

1. Go to [mnemo.studio](https://mnemo.studio) and sign in
2. Navigate to Settings and generate a Personal API Token
3. In the extension settings, paste your token

## License

MIT
