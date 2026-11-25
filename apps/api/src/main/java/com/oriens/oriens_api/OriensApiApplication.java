package com.oriens.oriens_api;

import jakarta.annotation.PostConstruct;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.TimeZone;

@EnableScheduling
@SpringBootApplication
public class OriensApiApplication {

	@PostConstruct
	public void init() {
		TimeZone.setDefault(TimeZone.getTimeZone("America/Recife"));
		System.out.println("Correction on zones: " + TimeZone.getDefault().getID());
	}

	public static void main(String[] args) {
		SpringApplication.run(OriensApiApplication.class, args);
	}

	@Bean
	public BCryptPasswordEncoder bCryptPasswordEncoder() {
		return new BCryptPasswordEncoder();
	}

}
