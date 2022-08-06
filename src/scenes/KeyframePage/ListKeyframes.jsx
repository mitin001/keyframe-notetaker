import React, { useState, useEffect } from 'react';
import { Grid, IconButton, Pagination } from '@mui/material';
import {
  FiArrowLeft, FiArrowRight, MdContentCopy, RiFinderLine,
} from 'react-icons/all';

const sort = (a, b) => {
  const { frame: aFrame } = a || {};
  const { frame: bFrame } = b || {};
  return aFrame - bFrame;
};

const pageSize = 100;

export default function ListKeyframes(props) {
  const {
    directory, timestamp,
    setInFrame, inFrame, setOutFrame, outFrame,
  } = props || {};
  const [page, setPage] = useState(1);
  const [keyframeList, setKeyframeList] = useState([]);

  useEffect(() => {
    window.ipc.send('listKeyframes', { directory });
    window.ipc.on('keyframesListed', (event, data) => {
      const { files = [] } = data || {};
      setKeyframeList(
        files.map(
          ({ basename, fullname }) => ({ frame: parseInt(basename, 10), basename, fullname }),
        ).sort(sort),
      );
    });
    return () => window.ipc.removeAllListeners('keyframesListed');
  }, [directory]);

  return (
    <div>
      <Pagination
        page={page}
        siblingCount={5}
        boundaryCount={5}
        count={Math.ceil(keyframeList.length / pageSize)}
        onChange={(event, newPage) => setPage(newPage)}
      />
      <Grid container sx={{ mt: 3, mb: 2 }}>
        {
          keyframeList.slice(pageSize * (page - 1), pageSize * (page - 1) + pageSize).map(({ frame, basename, fullname }) => (
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
      <Pagination
        page={page}
        siblingCount={5}
        boundaryCount={5}
        count={Math.ceil(keyframeList.length / pageSize)}
        onChange={(event, newPage) => setPage(newPage)}
      />
    </div>
  );
}
