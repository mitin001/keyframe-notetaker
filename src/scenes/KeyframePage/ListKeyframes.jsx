import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';

const sort = (a, b) => {
  const { basename: aBasename } = a || {};
  const { basename: bBasename } = b || {};
  const [aNum, bNum] = [parseInt(aBasename, 10), parseInt(bBasename, 10)];
  return aNum - bNum;
};

export default function ListKeyframes(props) {
  const { directory, timestamp } = props || {};
  const [keyframeList, setKeyframeList] = useState([]);

  useEffect(() => {
    window.ipc.send('listKeyframes', { directory });
    window.ipc.on('keyframesListed', (event, data) => {
      const { files = [] } = data || {};
      setKeyframeList(files);
    });
    return () => window.ipc.removeAllListeners('keyframesListed');
  }, []);

  return (
    <Box>
      {
        keyframeList.sort(sort).map(({ basename, fullname }) => (
          <img
            key={timestamp + basename}
            src={`file://${fullname}`}
            alt={basename}
          />
        ))
      }
    </Box>
  );
}
