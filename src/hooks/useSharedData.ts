import { useEffect } from "react";
import { useRouter } from "next/router";
import toast from "react-hot-toast";
import useFile from "../store/useFile";

interface SharedData {
  json: string;
  timestamp?: number;
  version?: string;
  settings?: {
    compressed?: boolean;
    [key: string]: any;
  };
}

// Decompress data that was compressed for URL sharing
const decompressFromURL = (compressed: string): string => {
  try {
    return decodeURIComponent(atob(compressed));
  } catch {
    return decodeURIComponent(compressed);
  }
};

export const useSharedData = () => {
  const router = useRouter();
  const setContents = useFile(state => state.setContents);

  useEffect(() => {
    if (!router.isReady) return;

    const { share } = router.query;
    
    if (share && typeof share === "string") {
      try {
        // Attempt to decode the shared data
        let decodedData: string;
        
        try {
          // Try base64 decoding first (for compressed data)
          decodedData = decompressFromURL(share);
        } catch {
          // Fallback to regular URL decoding
          decodedData = decodeURIComponent(share);
        }

        const sharedData: SharedData = JSON.parse(decodedData);
        
        if (sharedData.json) {
          // Validate that the JSON is parseable
          JSON.parse(sharedData.json);
          
          // Load the shared JSON into the editor
          setContents({ 
            contents: sharedData.json,
            hasChanges: false 
          });

          // Show success notification
          toast.success(
            `Shared data loaded${sharedData.timestamp 
              ? ` from ${new Date(sharedData.timestamp).toLocaleDateString()}`
              : ""
            }`
          );

          // Remove the share parameter from URL to clean it up
          const newQuery = { ...router.query };
          delete newQuery.share;
          
          router.replace(
            {
              pathname: router.pathname,
              query: newQuery,
            },
            undefined,
            { shallow: true }
          );
        } else {
          throw new Error("No JSON data found in shared link");
        }
      } catch (error) {
        console.error("Error loading shared data:", error);
        
        toast.error("The shared link appears to be invalid or corrupted");

        // Clean up the invalid share parameter
        const newQuery = { ...router.query };
        delete newQuery.share;
        
        router.replace(
          {
            pathname: router.pathname,
            query: newQuery,
          },
          undefined,
          { shallow: true }
        );
      }
    }
  }, [router, setContents]);
};