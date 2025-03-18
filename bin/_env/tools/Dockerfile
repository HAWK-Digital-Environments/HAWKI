FROM index.docker.io/library/debian:latest

# Install ruby and bashly
# @see https://bashly.dannyb.co/installing-ruby/#apt---ubuntu--debian
RUN apt-get -y update \
    && apt-get -y install build-essential libyaml-dev ruby-dev \
    && gem install bashly \
    && mkdir -p /opt/bashly-sources

# Install jq and pv
RUN apt-get -y update \
    && apt-get -y install \
     	jq \
     	pv
