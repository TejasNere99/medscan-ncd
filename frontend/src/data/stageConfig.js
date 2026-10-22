export const stageConfig = {
  camera: {
    position: [0.15, 1.3, 10.5],
    target: [0, 1.05, 0],
    fov: 40,
    near: 0.1,
    far: 60,
  },
  anchors: {
    character: { position: [3.25, -1.55, 0], scale: 1 },
    report: { position: [-2.7, -0.9, 0] },
    wordmark: { position: [1.25, -1.1, -0.3] },
    phone: { position: [1.8, 0.2, 0] },
    medicalInformation: { position: [-0.25, 1.55, -0.15] },
  },
  layout: {
    desktop: {
      '--anchor-headline-x': '7.5%', '--anchor-headline-y': '15%', '--anchor-headline-width': '45%',
      '--anchor-character-x': '69%', '--anchor-character-y': '27%', '--anchor-character-width': '26%',
      '--anchor-report-x': '9%', '--anchor-report-y': '60%', '--anchor-report-width': '36%',
      '--anchor-wordmark-x': '8%', '--anchor-wordmark-y': '47%', '--anchor-wordmark-width': '54%',
    },
    tablet: {
      '--anchor-headline-x': '7%', '--anchor-headline-y': '14%', '--anchor-headline-width': '48%',
      '--anchor-character-x': '75%', '--anchor-character-y': '28%', '--anchor-character-width': '21%',
      '--anchor-report-x': '7%', '--anchor-report-y': '57%', '--anchor-report-width': '42%',
      '--anchor-wordmark-x': '7%', '--anchor-wordmark-y': '42%', '--anchor-wordmark-width': '56%',
    },
    mobile: {
      '--anchor-headline-x': '7%', '--anchor-headline-y': '13%', '--anchor-headline-width': '86%',
      '--anchor-character-x': '69%', '--anchor-character-y': '37%', '--anchor-character-width': '30%',
      '--anchor-report-x': '7%', '--anchor-report-y': '58%', '--anchor-report-width': '80%',
      '--anchor-wordmark-x': '7%', '--anchor-wordmark-y': '42%', '--anchor-wordmark-width': '86%',
    },
    mobileCompact: {
      '--anchor-headline-x': '7%', '--anchor-headline-y': '12%', '--anchor-headline-width': '86%',
      '--anchor-character-x': '77%', '--anchor-character-y': '45%', '--anchor-character-width': '17%',
      '--anchor-report-x': '7%', '--anchor-report-y': '61%', '--anchor-report-width': '66%',
      '--anchor-wordmark-x': '7%', '--anchor-wordmark-y': '49%', '--anchor-wordmark-width': '86%',
    },
  },
};

export function getStageLayout(width = window.innerWidth, height = window.innerHeight) {
  if (width <= 700) return height <= 680 ? stageConfig.layout.mobileCompact : stageConfig.layout.mobile;
  if (width <= 1100 || height <= 650) return stageConfig.layout.tablet;
  return stageConfig.layout.desktop;
}
