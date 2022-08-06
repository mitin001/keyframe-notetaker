import React, { useState, useEffect } from 'react';
import { Grid, IconButton } from '@mui/material';
import {
  FiArrowLeft, FiArrowRight, MdContentCopy, RiFinderLine,
} from 'react-icons/all';

const sort = (a, b) => {
  const { basename: aBasename } = a || {};
  const { basename: bBasename } = b || {};
  const [aNum, bNum] = [parseInt(aBasename, 10), parseInt(bBasename, 10)];
  return aNum - bNum;
};

export default function ListKeyframes(props) {
  const {
    directory, timestamp,
    setInFrame, inFrame, setOutFrame, outFrame,
  } = props || {};
  const [keyframeList, setKeyframeList] = useState([]);

  useEffect(() => {
    window.ipc.send('listKeyframes', { directory });
    window.ipc.on('keyframesListed', (event, data) => {
      const { files = [] } = data || {};
      setKeyframeList(
        files.map(
          ({ basename, fullname }) => ({ frame: parseInt(basename, 10), basename, fullname }),
        ),
      );
    });
    return () => window.ipc.removeAllListeners('keyframesListed');
  }, []);

  return (
    <Grid container>
      {
        keyframeList.sort(sort).map(({ frame, basename, fullname }) => (
          <Grid item xs style={{ background: inFrame <= frame && frame <= outFrame ? 'antiquewhite' : 'initial' }}>
            <Grid item>
              <img
                style={{ maxWidth: 240 }}
                key={timestamp + basename}
                src={`file://${fullname}`}
                alt={basename}
              />
            </Grid>
            <IconButton
              size="small"
              onClick={() => window.ipc.send('copy', { text: frame })}
              onKeyPress={() => window.ipc.send('copy', { text: frame })}
            >
              {frame}
            </IconButton>
            <IconButton
              size="small"
              onClick={() => window.ipc.send('padLeft', { frame })}
              onKeyPress={() => window.ipc.send('padLeft', { frame })}
            >
              <FiArrowLeft size={22} />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => setInFrame(frame)}
              onKeyPress={() => setInFrame(frame)}
            >
              {frame === inFrame ? <b>[</b> : '['}
            </IconButton>
            <IconButton
              size="small"
              onClick={() => window.ipc.send('revealInFinder', { fullname })}
              onKeyPress={() => window.ipc.send('revealInFinder', { fullname })}
            >
              <RiFinderLine size={22} />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => window.ipc.send('copy', { fullname })}
              onKeyPress={() => window.ipc.send('copy', { fullname })}
            >
              <MdContentCopy size={22} />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => setOutFrame(frame)}
              onKeyPress={() => setOutFrame(frame)}
            >
              {frame === outFrame ? <b>]</b> : ']'}
            </IconButton>
            <IconButton
              size="small"
              onClick={() => window.ipc.send('padRight', { frame })}
              onKeyPress={() => window.ipc.send('padRight', { frame })}
            >
              <FiArrowRight size={22} />
            </IconButton>
          </Grid>
        ))
      }
    </Grid>
  );
}
