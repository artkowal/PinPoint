import React, { useState } from "react";
import SplashScreen from "../src/components/SplashScreen";
import MapView from "../src/components/map/MapView";

export default function App() {
  const [showMap, setShowMap] = useState(false);

  return !showMap ? (
    <SplashScreen onFinish={() => setShowMap(true)} />
  ) : (
    <MapView />
  );
}
