import React, { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  AdMob,
  BannerAdPosition,
  BannerAdSize,
  BannerAdPluginEvents,
} from '@capacitor-community/admob';

const BANNER_AD_ID = 'ca-app-pub-9352878858822070/4752124646';
const DEFAULT_HEIGHT = 0;
let admobInitPromise;

const ensureAdMobReady = async () => {
  if (!Capacitor.isPluginAvailable('AdMob')) return false;
  if (!admobInitPromise) {
    admobInitPromise = AdMob.initialize()
      .then(() => true)
      .catch(() => false);
  }
  try {
    return await admobInitPromise;
  } catch {
    return false;
  }
};

const getBannerWidth = () => {
  if (typeof window === 'undefined') return 360;
  return Math.min(window.innerWidth || 360, 1200);
};

const setBannerHeight = (height = 0) => {
  if (typeof document === 'undefined') return;
  document.documentElement.style.setProperty('--banner-height', `${height}px`);
};

const BannerAd = () => {
  const widthRef = useRef(getBannerWidth());
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (!Capacitor.isPluginAvailable('AdMob')) return undefined;
    let canceled = false;
    let sizeListener;
    let loadListener;
    let failListener;

    const registerBannerListeners = async () => {
      sizeListener = await AdMob.addListener(BannerAdPluginEvents.SizeChanged, () => {
        if (canceled) return;
        setShouldRender(true);
      });

      loadListener = await AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
        if (canceled) return;
        setShouldRender(true);
      });

      failListener = await AdMob.addListener(BannerAdPluginEvents.FailedToLoad, () => {
        if (canceled) return;
        setShouldRender(false);
        setBannerHeight(0);
      });
    };

    const listenersReady = registerBannerListeners().catch((error) => {
      // eslint-disable-next-line no-console
      console.warn('Failed to register AdMob banner listeners', error);
      setShouldRender(false);
      setBannerHeight(0);
    });

    const showBanner = async () => {
      await listenersReady;
      const ready = await ensureAdMobReady();
      if (!ready || canceled) return;
      try {
        await AdMob.hideBanner().catch(() => {});
        setShouldRender(true);
        setBannerHeight(DEFAULT_HEIGHT);
        await AdMob.showBanner({
          adId: BANNER_AD_ID,
          adSize: BannerAdSize.ADAPTIVE_BANNER,
          width: widthRef.current,
          position: BannerAdPosition.BOTTOM_CENTER,
          margin: 0,
        });
      } catch (error) {
        if (canceled) return;
        if (canceled) return;
        setShouldRender(false);
        setBannerHeight(0);
        // eslint-disable-next-line no-console
        console.warn('Failed to load banner ad', error);
      }
    };

    const handleResize = () => {
      const nextWidth = getBannerWidth();
      if (nextWidth === widthRef.current) return;
      widthRef.current = nextWidth;
      showBanner();
    };

    showBanner();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
    }

    return () => {
      canceled = true;
      sizeListener?.remove();
      loadListener?.remove();
      failListener?.remove();
      setShouldRender(false);
      setBannerHeight(0);
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
      }
      AdMob.hideBanner().catch(() => {});
    };
  }, []);

  if (!shouldRender) return null;
  return <div className="banner-ad-slot" aria-hidden="true" />;
};

export default BannerAd;
