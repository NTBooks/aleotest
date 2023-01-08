Steps for setting up docker dev environment

Set up new git repo, make new dev environment from blank repo

In terminal run:
sudo apt update
sudo apt install curl
curl https://sh.rustup.rs -sSf | sh
sudo apt install openssl
sudo apt install libssl-dev

git clone https://github.com/AleoHQ/leo
cd leo

cargo install --path .

mkdir nodeapp
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | bash
nvm install node
nvm install-latest-npm
