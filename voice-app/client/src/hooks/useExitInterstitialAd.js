import { useCallback, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  AdMob,
  InterstitialAdPluginEvents,
} from '@capacitor-community/admob';

const INTERSTITIAL_AD_ID = 'ca-app-pub-9352878858822070/4521024505';

const useExitInterstitialAd = () => {
  const readyRef = useRef(false);
  const loadingRef = useRef(false);
  const isNativeAdAvailable = useRef(Capacitor.isPluginAvailable('AdMob'));
  const listenersCleanupRef = useRef([]);
  const dismissActionRef = useRef(null);

  const ensureLoaded = useCallback(async () => {
    if (!isNativeAdAvailable.current || loadingRef.current || readyRef.current) {
      return readyRef.current;
    }
    loadingRef.current = true;
    try {
      await AdMob.initialize();
      console.log('[Interstitial] Initializing & loading ad');
      await AdMob.prepareInterstitial({
        adId: INTERSTITIAL_AD_ID,
      });
      readyRef.current = true;
      console.log('[Interstitial] Ad prepared successfully');
    } catch (error) {
      console.warn('[Interstitial] Failed to prepare', error);
      readyRef.current = false;
    } finally {
      loadingRef.current = false;
    }
    return readyRef.current;
  }, []);

  const showAd = useCallback(async (options = {}) => {
    const { onDismiss } = options;
    if (!isNativeAdAvailable.current) {
      console.warn('[Interstitial] AdMob plugin not available');
      return false;
    }
    if (!readyRef.current) {
      await ensureLoaded();
      console.warn('[Interstitial] Not ready yet, skipping show');
      return false;
    }
    try {
      dismissActionRef.current = typeof onDismiss === 'function' ? onDismiss : null;
      await AdMob.showInterstitial();
      readyRef.current = false;
      ensureLoaded();
      return true;
    } catch (error) {
      dismissActionRef.current = null;
      readyRef.current = false;
      ensureLoaded();
      return false;
    }
  }, [ensureLoaded]);

  useEffect(() => {
    if (!isNativeAdAvailable.current) return undefined;
    ensureLoaded();
    const registerListeners = async () => {
      const tasks = [
        AdMob.addListener(InterstitialAdPluginEvents.Loaded, () => {
          console.log('[Interstitial] Loaded event fired');
          readyRef.current = true;
        }),
        AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, (error) => {
          console.warn('[Interstitial] FailedToLoad', error);
          readyRef.current = false;
        }),
        AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, (error) => {
          console.warn('[Interstitial] FailedToShow', error);
          readyRef.current = false;
          ensureLoaded();
        }),
        AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
          console.log('[Interstitial] Dismissed');
          const action = dismissActionRef.current;
          dismissActionRef.current = null;
          if (action) {
            try {
              action();
            } catch (dismissError) {
              console.warn('[Interstitial] onDismiss callback failed', dismissError);
            }
          }
          ensureLoaded();
        }),
        AdMob.addListener(InterstitialAdPluginEvents.Showed, () => {
          console.log('[Interstitial] Showed');
        }),
      ];
      listenersCleanupRef.current = await Promise.all(tasks);
    };
    registerListeners().catch((error) => console.warn('[Interstitial] Listener registration failed', error));

    return () => {
      listenersCleanupRef.current.forEach((listener) => {
        try {
          listener.remove();
        } catch (_) {}
      });
      listenersCleanupRef.current = [];
    };
  }, [ensureLoaded]);

  return showAd;
};

export default useExitInterstitialAd;
