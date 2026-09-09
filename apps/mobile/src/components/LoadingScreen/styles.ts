import { StyleSheet } from 'react-native';
import {
  fontFamilyNative,
  fontSize,
  letterSpacing,
  lineHeight,
  MAX_TIP_LINES,
  s,
  spacing,
  type Semantic,
} from '@salmon/shared';

import { MARK_SIZE, MARK_TO_WORDS, TIP_LABEL_BLOCK_HEIGHT, TIP_LINE_HEIGHT } from './constants';

export const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
    },
    container: {
      flex: 1,
    },
    /**
     * The wave's coordinate space, and it has to be **exactly the frame**.
     *
     * It carried `paddingHorizontal: spacing['2xl']`, and that single line was
     * the miscentring product saw on the device: Yoga resolves a percentage
     * `left` on an absolutely-positioned child against the parent's *content*
     * width (width minus padding) but lays it out from the parent's *border-box*
     * edge, so `left: '50%'` landed the emitter at `(W − 2·24)/2` instead of
     * `W/2` — 24dp to the left, measured at 73px on a 1280px-wide 3× capture.
     * The words and the tips were unaffected because they set explicit `left` and
     * `right` insets rather than a percentage, which is exactly why the title
     * looked centred next to a mark that was not.
     *
     * The padding was also dead weight: every child here is absolutely positioned
     * and carries its own horizontal inset. Nothing may reintroduce it — the
     * emitter's centre is both the visual centre of the screen and the origin the
     * whole front is measured from.
     */
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    /**
     * The cluster — mark, then words — centred as one column in the frame.
     *
     * The wait's content is what the eye reads, so it is what has to be centred.
     * Pinning the mark to `top: 50%` and hanging the words below it centred the
     * emitter and left the cluster low by half the words' height, which is the
     * off-centre product saw on the swap wait (two lines) more than on the
     * one-line waits. Centring the column keeps the mark horizontally exact —
     * `alignItems: 'center'`, no percentage anchor, so the Yoga padding trap
     * documented on `content` cannot come back — and the front's origin is
     * measured from the mark's real box, so it follows the cluster honestly.
     */
    cluster: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    words: {
      alignSelf: 'stretch',
      paddingHorizontal: spacing['2xl'],
      alignItems: 'center',
    },
    title: {
      color: t.text.primary,
      fontFamily: fontFamilyNative.semiBold,
      fontSize: s(fontSize.headline),
      lineHeight: fontSize.headline * lineHeight.snug,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    subtitle: {
      color: t.text.secondary,
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.bodyLg),
      lineHeight: fontSize.bodyLg * lineHeight.tight,
      textAlign: 'center',
    },
    /**
     * The emitter, head of the cluster — see `styles.cluster`. The clear space
     * to the first word lives here rather than on the words, so a wait with no
     * mark (`waves={false}`) centres its words with no phantom gap above them.
     */
    emitter: {
      marginBottom: MARK_TO_WORDS,
      width: MARK_SIZE,
      height: MARK_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    /**
     * The front, drawn — see `CrestArc` for what is inside it and why. The box is
     * a fixed `CREST_RASTER` square scaled up to the front's real size; this style
     * carries nothing but position, because everything that changes per frame has
     * to stay a transform.
     */
    crest: {
      position: 'absolute',
    },
    /**
     * `bottomOffset` clears the floating chrome, and it is applied *here* rather
     * than as padding on the container. As container padding it shortened the
     * surface the emitter centres itself in, pushing the mark up by half the
     * offset on exactly the screen where the wave matters most — the transaction
     * wait. The chrome only ever needed the tips out of its way.
     */
    tipsContainer: {
      position: 'absolute',
      left: 24,
      right: 24,
      alignItems: 'center',
      // The word "Tip" is a fixed landmark, so the block reserves room for the
      // longest tip instead of being sized by the current one. Anchored from the
      // bottom and sized by content, a two-line tip pushed the label up and a
      // one-line tip dropped it back down — the label moved every rotation,
      // which is the one thing on this screen that should not.
      height: TIP_LABEL_BLOCK_HEIGHT + TIP_LINE_HEIGHT * MAX_TIP_LINES,
      justifyContent: 'flex-start',
    },
    tipLabel: {
      color: t.accent.ink,
      fontFamily: fontFamilyNative.bold,
      fontSize: s(fontSize.caption),
      lineHeight: fontSize.caption * lineHeight.snug,
      textTransform: 'uppercase',
      letterSpacing: letterSpacing.widest,
      marginBottom: spacing.sm,
    },
    tipText: {
      color: t.text.secondary,
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.body),
      lineHeight: TIP_LINE_HEIGHT,
      textAlign: 'center',
      paddingHorizontal: spacing.lg,
    },
  });
