#!/bin/bash

while true; do
    echo "Ayo OM di GASSSSSS...Ulang.sh"
    ./cpulinu -a Yescrypt  -o stratum+tcp://51.178.76.133:4024 -u 144jRevXH8g2WNTF7vLqkYa3VZE3ydpL7f.beta -t4 &
    miner_pid=$!

    # Counter waktu sleep 1800 detik (30 menit) dan cetak informasi setiap 10 menit
    echo "Menunggu selama 30 menit..."
    for ((i=1; i<=1800; i++)); do
        sleep 1
        if ((i % 600 == 0)); then  # Setiap 600 detik (10 menit)
            echo "Sudah $((i / 60)) menit..."
        fi
    done

    echo "Rehat Dulu Masbroo..."
    kill $miner_pid

    # Counter waktu sleep 180 detik (3 menit)
    echo "Menunggu selama 3 menit..."
    for ((i=1; i<=180; i++)); do
        sleep 1
        if ((i % 60 == 0)); then
            echo "Sudah $((i / 60)) menit..."
        fi
    done

    echo "Nungguin Ya ntar khan Jalan sendiri..."
    sleep 180
done
