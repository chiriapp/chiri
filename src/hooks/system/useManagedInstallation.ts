// import { useEffect, useState } from 'react';
// import { getInstallType, type InstallType } from '$utils/platform';

// // Cache the installation type at module level to avoid re-fetching
// let cachedInstallType: InstallType | null = null;
// let fetchPromise: Promise<InstallType> | null = null;

// /**
//  * Hook to detect if the app is running under a managed installation
//  * (Nix, AUR) where updates are handled externally
//  */
// export const useManagedInstallation = () => {
//   const [installType, setInstallType] = useState<InstallType | null>(cachedInstallType);

//   useEffect(() => {
//     // If we already have a cached value, we're done
//     if (cachedInstallType !== null) {
//       return;
//     }

//     // If there's already a fetch in progress, wait for it
//     if (fetchPromise) {
//       fetchPromise.then((type) => {
//         cachedInstallType = type;
//         setInstallType(type);
//       });
//       return;
//     }

//     // Start a new fetch
//     fetchPromise = getInstallType();
//     fetchPromise.then((type) => {
//       cachedInstallType = type;
//       setInstallType(type);
//       fetchPromise = null;
//     });
//   }, []);

//   const isManagedInstall = installType !== null && installType !== 'standard';

//   return {
//     isManagedInstall,
//     installType,
//     isLoading: installType === null,
//   };
// };
