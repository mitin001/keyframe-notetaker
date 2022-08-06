import React, { useEffect, useState } from 'react';
import { Box, Button } from '@mui/material';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import CssBaseline from '@mui/material/CssBaseline';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { IoMdAddCircle } from 'react-icons/io';
import { FaFileVideo } from 'react-icons/fa';
import ReactTooltip from 'react-tooltip';
import mainTheme from '../../theme';
import { DrawerHeader, AppBar, Drawer } from '../../drawer';
import InitialIcon from '../../InitialIcon';
import ListKeyframes from './ListKeyframes';

export default function KeyframePage() {
  const theme = mainTheme;
  const [open, setOpen] = useState(false);
  const [databaseList, setDatabaseList] = useState([]);
  const [selectedDatabase, selectDatabase] = useState({});
  const [inFrame, setInFrame] = useState(null);
  const [outFrame, setOutFrame] = useState(null);
  const { fullname: selectedDbFullname, basename: selectedDbName } = selectedDatabase || {};

  useEffect(() => {
    window.ipc.send('listDatabases');
    window.ipc.on('databasesListed', (event, data) => {
      const { directories = [] } = data || {};
      setDatabaseList(directories);
    });
    return () => window.ipc.removeAllListeners('databasesListed');
  }, []);

  // clear selected database when the database list is updated
  useEffect(() => {
    selectDatabase({});
  }, [databaseList]);

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" open={open} theme={theme}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={() => setOpen(true)}
            edge="start"
            sx={{
              marginRight: 5,
              ...(open && { display: 'none' }),
            }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            {selectedDbName || 'New Keyframe Database'}
          </Typography>
        </Toolbar>
      </AppBar>
      <Drawer variant="permanent" open={open}>
        <DrawerHeader>
          <IconButton onClick={() => setOpen(false)}>
            {theme.direction === 'rtl' ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        </DrawerHeader>
        <Divider />
        <List>
          {
            databaseList.map(({ basename, fullname }) => (
              <ListItemButton
                key={fullname}
                sx={{
                  minHeight: 48,
                  justifyContent: open ? 'initial' : 'center',
                  px: 2.5,
                }}
                onClick={() => {
                  selectDatabase({ basename, fullname });
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: open ? 3 : 'auto',
                    justifyContent: 'center',
                  }}
                >
                  <InitialIcon text={basename} borderStyle="inset" />
                </ListItemIcon>
                <ListItemText primary={basename} sx={{ opacity: open ? 1 : 0 }} />
              </ListItemButton>
            ))
          }
          <ListItemButton
            sx={{
              minHeight: 48,
              justifyContent: open ? 'initial' : 'center',
              px: 2.5,
            }}
            onClick={() => selectDatabase(null)}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: open ? 3 : 'auto',
                justifyContent: 'center',
              }}
            >
              <IoMdAddCircle
                data-delay-show="500"
                data-tip="New"
                size={25}
              />
              <ReactTooltip />
            </ListItemIcon>
            <ListItemText primary="New" sx={{ opacity: open ? 1 : 0 }} />
          </ListItemButton>
        </List>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <DrawerHeader />
        {
          selectedDbFullname
            ? (
              <ListKeyframes
                inFrame={inFrame}
                outFrame={outFrame}
                setInFrame={setInFrame}
                setOutFrame={setOutFrame}
                directory={selectedDbFullname}
                timestamp={new Date().valueOf()}
              />
            )
            : (
              <Box>
                <Button
                  theme={theme}
                  variant="contained"
                  startIcon={<FaFileVideo size={25} />}
                  onKeyPress={() => window.ipc.send('openVideo')}
                  onClick={() => window.ipc.send('openVideo')}
                >
                  Select video
                </Button>
              </Box>
            )
        }
      </Box>
    </Box>
  );
}
