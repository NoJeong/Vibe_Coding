import React, { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { AdMob, BannerAdPosition, BannerAdSize } from '@capacitor-community/admob';

const BANNER_AD_ID = 'ca-app-pub-9352878858822070/4521024505';
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

const BannerAd = () => {
  useEffect(() => {
    if (!Capacitor.isPluginAvailable('AdMob')) return undefined;
    let canceled = false;

    const show = async () => {
      const ready = await ensureAdMobReady();
      if (!ready || canceled) return;
      try {
        await AdMob.showBanner({
          adId: BANNER_AD_ID,
          adSize: BannerAdSize.BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          margin: 0,
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Failed to load banner ad', error);
      }
    };

    show();

    return () => {
      canceled = true;
      AdMob.hideBanner().catch(() => {});
    };
  }, []);

  // Native 배너가 화면 하단에 오버레이되므로, 웹 레이아웃이 밀리지 않도록 여백만 유지한다.
  return <div style={{ height: 50 }} />;
};

export default BannerAd;
