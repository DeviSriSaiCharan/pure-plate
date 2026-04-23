import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Camera, useCameraDevice, useFrameOutput } from 'react-native-vision-camera';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { Worklets } from 'react-native-worklets-core';
// import Svg, { Polygon } from 'react-native-svg';

export const ARCamera = () => {
  const device = useCameraDevice('back');
  const [hasPermission, setHasPermission] = useState(false);

  // ------------------------------------------------------------------------
  // TFLITE MODEL LOADING
  // In production, this will load the YOLOv8-Seg model downloaded via 
  // Firebase Remote Config, or fallback to a bundled `.tflite` asset.
  // ------------------------------------------------------------------------
  // const model = useTensorflowModel(require('../../assets/yolov8-seg-nano.tflite'));

  useEffect(() => {
    (async () => {
      // Prompt user for Camera hardware access on initial boot
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // ------------------------------------------------------------------------
  // REAL-TIME C++ FRAME PROCESSOR
  // This block runs entirely separate from the React JS thread.
  // It feeds live camera frames directly into the TFLite ML Model at 30+ FPS.
  // ------------------------------------------------------------------------
  const frameOutput = useFrameOutput({
    onFrame: (frame) => {
      'worklet'; // Marks this as a Reanimated-compatible C++ worklet

      // if (model.state === 'loaded') {
      //   const result = model.model.runSync([frame]);
      //   // TODO: Send 'result' arrays back to JS thread to draw SVG Polygons
      //   console.log("Segmentation Mask Outline: ", result);
      // }
      
      frame.dispose(); // Required in v5 to prevent memory leaks!
    }
  }); // Pass dependencies here if needed

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Scanner needs Camera Access.</Text>
      </View>
    );
  }

  if (device == null) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Initializing Hardware...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        outputs={[frameOutput]}
      />
      {/* 
        This is where our glowing Iron Man HUD borders are drawn on top of the camera!
        <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
           <Polygon points={maskCoordinates} stroke="cyan" strokeWidth="3" fill="rgba(0, 255, 255, 0.2)" />
        </Svg>
      */}
      <View style={styles.overlayText}>
        <Text style={styles.hudText}>Tracking...</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center'
  },
  text: {
    color: '#FFF',
    fontSize: 16
  },
  overlayText: {
    position: 'absolute',
    top: 50,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 8
  },
  hudText: {
    color: 'cyan',
    fontWeight: 'bold',
    fontFamily: 'monospace'
  }
});
