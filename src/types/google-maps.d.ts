declare global {
  interface Window {
    google: typeof google;
  }
}

declare namespace google.maps {
  namespace places {
    class Autocomplete {
      constructor(inputField: HTMLInputElement, opts?: AutocompleteOptions);
      getPlace(): PlaceResult;
      addListener(event: string, callback: () => void): void;
    }

    interface AutocompleteOptions {
      types?: string[];
      componentRestrictions?: { country: string };
    }

    interface PlaceResult {
      name?: string;
      formatted_address?: string;
      geometry?: {
        location: {
          lat(): number;
          lng(): number;
        };
      };
    }
  }
} 