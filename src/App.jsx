import React, { useState } from "react";
import SplashScreen from "./components/SplashScreen";
import MapView from "./components/MapView";

function App() {
  const [showMap, setShowMap] = useState(false);

  return (
    <>
      {!showMap ? (
        <SplashScreen onFinish={() => setShowMap(true)} />
      ) : (
        <MapView />
      )}
    </>
  );
}

export default App;
