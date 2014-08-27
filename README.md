###player-demo-chromeapp###
**Copyright © 2010 - August 27, 2014 Rise Vision Incorporated.**

Use of this software is governed by the GPLv3 license (reproduced in the LICENSE file).

player-demo-chromeapp is a Chrome App, responsible for launching Viewer, to display HTML content from Rise Vision - our digital signage management application. More information about Viewer can be found in the Rise-Vision/viewer repository. Because player-demo-chromeapp was built on the Chrome App architecture, we are able to provide a flexible Player for the Rise Vision digital signage application that can run on Chrome OS, Linux, Windows and MAC

**How to get started?**
All source code for the Project is included in this repository. Once you have forked and cloned the Project to your local repository, you can load player-demo-chromeapp in Chrome

1. Open Chrome browswer and navigate to, chrome://extensions

2. Select the checkbox, “Developer mode” in the top right

3. Select “Load unpacked extensions…”

4. Browse to and select the directory of your local repository for the Project

Once loaded, the Chrome App can be ran from the Chrome App Launcher

**To develop on your local machine:**
Source code can be modified from the Project’s local repository using your preferred IDE or text editor.  Once changes have been made the Chrome App needs to be reloaded. To reload the Chrome App

1. Open Chrome browswer and navigate to, chrome://extensions

2. If applicable, select the checkbox, “Developer mode” in the top right

3. Locate the “Rise Chrome App Player” and select “Reload”

player-demo-chromeapp uses the standard Chrome App architecture. To facilitate communication between Viewer and player, two local web servers are created using chrome.socket library.

1. Player “js/player/player.js” running on port 9449 handles viewer commands.

2. Cache “js/cache/cache.js” running on port 9494 is cache server for video files.

You can create a Display id by visiting http://risevision.com, you will need to register if you didn't have already and know its FREE.

If you have any questions or problems please don't hesitate to join our lively and responsive community at http://community.risevision.com.

If you are looking for user documentation on Rise Vision please see http://www.risevision.com/help/users/

If you would like more information on developing applications for Rise Vision please visit http://www.risevision.com/help/developers/. 

And if you are considering **contributing to this open source project**, our favourite option, we have 3 good reasons why we released this code under version 3 of the GNU General Public License, and we think they are 3 good reasons for why you should get involved too:

Together we can make something far better than we could on our own.

If you want to use our code to make something that is specific to you, and that doesn’t fit with what we want to do, we don’t want to get in your way. Take our code and make just what you need.

We know that some of you nervous types worry about what happens if our company gets taken out in the zombie apocalypse. We get it, and neither one of us wants to deal with that delicate question of software escrow agreements for the “just in case we kick the bucket scenario”. No worries! We made it easy. No fuss, no cost, no lawyers! We published the software here. Have at it.

3 compelling reasons for why you should actively join our project. 

Together we can make something better than either of us could on our own. 

If you have something completely different in mind, no problem, take our code, fork it, and make what you need, but respect the open source movement, and our license, and keep it open. 

Become a zombie crusader!

Are we missing something? Something could be better? Jump in, branch our code, make what you want, and send us a Pull Request. If it fits for both of us then of course we will accept it, maybe with a tweak or two, test it, and deploy it. If it doesn’t fit, no worries, just fork our code and create your own specialized application for your specific needs. Or, if you’re just feeling paranoid, download the code, and put it under your mattress.

**Either way, welcome to our project!**
