import os
import json
import shutil
import gzip
import xml.etree.ElementTree as ET
import argparse # Import argparse


def extract_als_data(als_path):
    """Extract and parse Ableton ALS (XML) data from a GZIP file."""
    with gzip.open(als_path, 'rb') as file:
        tree = ET.parse(file)
        root = tree.getroot()
        # print(ET.tostring(root, encoding='utf8').decode('utf8'))
    
    return root
  
def xml_to_dict(element):
    """Recursively convert an XML element and its children to a dictionary."""
    result = {}
    
    # Convert attributes
    if element.attrib:
        result.update(element.attrib)
    
    # Convert child elements
    for child in element:
        child_data = xml_to_dict(child)
        
        # Handle multiple children with the same tag (store as list)
        if child.tag in result:
            if isinstance(result[child.tag], list):
                result[child.tag].append(child_data)
            else:
                result[child.tag] = [result[child.tag], child_data]
        else:
            result[child.tag] = child_data
    
    # If the element has text content, store it
    if element.text and element.text.strip():
        result["text"] = element.text.strip()
    
    return result

def parse_tracks(root):
    """Extract track details from the Ableton XML."""
    tracks_data = []
    tracks = root.find("LiveSet").find("Tracks")
    
    
    for track in tracks:
        if(track.tag != "AudioTrack" and track.tag != "MidiTrack"):
          continue
        track_id = track.attrib.get("Id", "Unknown")
        track_name = track.find("Name").find("EffectiveName").attrib.get("Value", "Unknown")
        devicechain = track.find("DeviceChain")
        sequencer = devicechain.find("MainSequencer")
        mixer = devicechain.find("Mixer")
        volume = mixer.find("Volume").find("Manual").attrib.get("Value", "Unknown")
        volumeMin = mixer.find("Volume").find("MidiControllerRange").find("Min").attrib.get("Value", "Unknown")
        volumeMax = mixer.find("Volume").find("MidiControllerRange").find("Max").attrib.get("Value", "Unknown")
        
        data = {
          "type": track.tag,
          "id": track_id,
          "name": track_name,
          "volume": volume,
          "volumeMin": volumeMin,
          "volumeMax": volumeMax,
          "events": []
        }
        
        if track.tag == "MidiTrack":
          # for each event:
          # if its a single sample midi clip:
          # [
          #   -start
          #   -end
          #   -loop_info
          #   -notes:
          #     [ #for each note
          #       -key
          #       -num_occurences
          #       -occurences:
          #         [  # every occurence of that note
          #           -start
          #           -duration
          #           -velocity
          #           -velocity_deviation
          #           -enabled
          #     
          #         ]
          #     ]
          #   ]
          #
          # ]
          
          events = [xml_to_dict(event) for event in sequencer.find("ClipTimeable").find("ArrangerAutomation").find("Events").findall("MidiClip")]
          formatted_events = []
          for event in events:
            keytracks = event["Notes"]["KeyTracks"]["KeyTrack"]
            #if keytracks has only one element it is a dict
            # if it has more than one element it is a list
            # print(keytracks)
            if isinstance(keytracks, dict):
              keytracks = [keytracks]
            # print(len(keytracks))
            
            notes = []
            
            start = event["CurrentStart"]["Value"]
            end = event["CurrentEnd"]["Value"]
            loopStart = event["Loop"]["LoopStart"]["Value"]
            loopEnd = event["Loop"]["LoopEnd"]["Value"]

            # Convert to float instead of int
            eventRange = float(end) - float(start)
            loopRange = float(loopEnd) - float(loopStart)
            # Calculate repeats using float division and then convert to int for iteration
            repeats = int(eventRange // loopRange)
            lastLoopRange = eventRange % loopRange
            
            
            
            for i in range(len(keytracks)):
              keytrack = keytracks[i]
              num_occurences = len(keytrack["Notes"]["MidiNoteEvent"])
              occurences_data = []
              note_events = keytrack["Notes"]["MidiNoteEvent"]
              if isinstance(note_events, dict):
                note_events = [note_events]
              for occurence in note_events:
                
                occurence_data = {
                  "start": occurence["Time"],
                  "duration": occurence["Duration"],
                  "velocity": occurence["Velocity"],
                  "velocity_deviation": occurence["VelocityDeviation"],
                  "enabled": occurence["IsEnabled"]
                }
                occurences_data.append(occurence_data)
              note_data = {
                "key": keytrack["MidiKey"],
                "num_occurences": num_occurences,
                "occurences": occurences_data
              }
              notes.append(note_data)
              
            if repeats == 1 and lastLoopRange == 0:
              event_data = {
                "start": event["CurrentStart"]["Value"],
                "end": event["CurrentEnd"]["Value"],
                "loop": {
                  "start": event["Loop"]["LoopStart"]["Value"],
                  "end": event["Loop"]["LoopEnd"]["Value"],
                  "on": event["Loop"]["LoopOn"]["Value"],
                  "hiddenLoopStart": event["Loop"]["HiddenLoopStart"]["Value"],
                  "hiddenLoopEnd": event["Loop"]["HiddenLoopEnd"]["Value"]
                },
                "notes": notes
              }
              formatted_events.append(event_data)
              data["events"] = formatted_events     
            else:
              for r in range(int(repeats)):
                event_data = {
                  "start": int(start) + (r * loopRange),
                  "end": int(start) + ((r + 1) * loopRange),
                  "loop": {
                    "start": loopStart,
                    "end": loopEnd,
                    "on": event["Loop"]["LoopOn"]["Value"],
                    "hiddenLoopStart": event["Loop"]["HiddenLoopStart"]["Value"],
                    "hiddenLoopEnd": event["Loop"]["HiddenLoopEnd"]["Value"]
                  },
                  "notes": notes
                }
                formatted_events.append(event_data)
              if lastLoopRange > 0:
                event_data = {
                  "start": int(start) + (repeats * loopRange),
                  "end": int(start) + (repeats * loopRange) + lastLoopRange,
                  "loop": {
                    "start": loopStart,
                    "end": loopEnd,
                    "on": event["Loop"]["LoopOn"]["Value"],
                    "hiddenLoopStart": event["Loop"]["HiddenLoopStart"]["Value"],
                    "hiddenLoopEnd": event["Loop"]["HiddenLoopEnd"]["Value"]
                  },
                  "notes": notes
                }
                formatted_events.append(event_data)
              data["events"] = formatted_events
        # print(json.dumps(data, indent=4))   
        
        elif track.tag == "AudioTrack":
          # for each event:
          # [
          #   -start
          #   -end
          #   -audio_name
          #   -audio_file
          #   -loop_info
          #   -PitchCoarse
          #   -PitchFine
          #   
          # ]
          #
          
          events = [xml_to_dict(event) for event in sequencer.find("Sample").find("ArrangerAutomation").find("Events").findall("AudioClip")]
          formatted_events = []
          for event in events:
            event_data = {
              "start": event["CurrentStart"]["Value"],
              "end": event["CurrentEnd"]["Value"],
              "audio_name": event["Name"]["Value"],
              "audio_file": event["SampleRef"]["FileRef"]["RelativePath"]["Value"],
              "loop": {
                "start": event["Loop"]["LoopStart"]["Value"],
                "end": event["Loop"]["LoopEnd"]["Value"],
                "on": event["Loop"]["LoopOn"]["Value"]
              }
              
            }
            formatted_events.append(event_data)
            data["events"] = formatted_events
        
        
        
        
        tracks_data.append(data)
    # print(json.dumps(tracks_data, indent=4))
    return tracks_data

def match_wav_files(folder_path, als_name, tracks):
    """Match track names with corresponding bounced audio files (.wav or .flac)."""
    audio_files = [f for f in os.listdir(folder_path) if f.endswith((".wav", ".flac"))]
    matched_tracks = []
    
    for track in tracks:
        track_number = track["id"]
        # Match audio files that start with the project name and track name
        matching_audio = next((audio for audio in audio_files if audio.startswith(f"{als_name} {track['name']}")), None)
        
        if matching_audio:
            # Store original file info for copying
            track["original_audio_file"] = matching_audio
            
            # Change extension to .flac in the track data (this will be in the JSON)
            base_name = os.path.splitext(matching_audio)[0]
            track["audio_file"] = f"{base_name}.flac"
            track["audio_format"] = "flac"
            
            matched_tracks.append(track)
    
    return matched_tracks

def clean_tracks_folder(tracks_folder):
    """Clear the tracks/ folder before moving new bounced files."""
    if os.path.exists(tracks_folder):
        shutil.rmtree(tracks_folder)
    os.makedirs(tracks_folder)   


def move_bounced_tracks(folder_path, tracks_folder, matched_tracks):
    """Move matched audio files to the tracks/ folder, converting WAV to FLAC."""
    import subprocess
    import sys
    
    # Import compresswav utility
    compresswav_path = os.path.join(os.path.dirname(__file__), "compresswav.py")
    
    for track in matched_tracks:
        if track.get("original_audio_file"):
            original_file = track["original_audio_file"]
            src_path = os.path.join(folder_path, original_file)
            
            # Destination will always be .flac
            flac_filename = track["audio_file"]  # Already has .flac extension
            dest_path = os.path.join(tracks_folder, flac_filename)
            
            # If source is WAV, convert to FLAC
            if original_file.lower().endswith(".wav"):
                print(f"Converting {original_file} to FLAC...")
                try:
                    subprocess.run([sys.executable, compresswav_path, src_path, dest_path], check=True)
                except subprocess.CalledProcessError as e:
                    print(f"Error converting {original_file} to FLAC: {e}")
                    # Fallback to copy if conversion fails
                    print(f"Falling back to direct copy of original file")
                    shutil.copy(src_path, os.path.join(tracks_folder, original_file))
                    # Update track data to use original file
                    track["audio_file"] = original_file
                    track["audio_format"] = os.path.splitext(original_file)[1][1:]
            else:
                # If already FLAC, just copy
                shutil.copy(src_path, dest_path)

def main(folder_path, output_folder=None, skip_audio_match=False):
    """Main function to parse the Ableton project and process audio files."""
    als_file = next((f for f in os.listdir(folder_path) if f.endswith(".als")), None)
    if not als_file:
        print("No Ableton project (.als) found!")
        return
    
    als_name = os.path.splitext(als_file)[0]
    als_path = os.path.join(folder_path, als_file)
    
    print(f"Parsing Ableton Project: {als_name}.als")
    
    # Extract and parse the ALS XML
    root = extract_als_data(als_path)
    
    # Extract track details
    tracks = parse_tracks(root)
    
    maintrack = root.find("LiveSet").find("MainTrack")
    tempo = maintrack.find("DeviceChain").find("Mixer").find("Tempo").find("Manual").attrib.get("Value", "Unknown")
    
    tracks_to_save = []
    if skip_audio_match:
      print("Skipping audio file matching and processing.")
      tracks_to_save = tracks # Use all parsed tracks direc
    
    else:
      # Match tracks with corresponding bounced audio files
      matched_tracks = match_wav_files(folder_path, als_name, tracks)
      tracks_to_save = matched_tracks
      
      # Validate track count
      expected_tracks = len(tracks)
      matched_track_count = len(matched_tracks)
      print(f"Expected Tracks: {expected_tracks}, Matched Tracks: {matched_track_count}")
      
      # Clear and repopulate tracks folder
      tracks_folder = "./tracks" if not output_folder else os.path.join(output_folder, "tracks")
      clean_tracks_folder(tracks_folder)
      
      # Convert WAV files to FLAC and move them to the tracks folder
      move_bounced_tracks(folder_path, tracks_folder, matched_tracks)
    
    # Save JSON output
    json_output_path = os.path.join("./" if not output_folder else output_folder, "ableton_project.json")
    with open(json_output_path, "w") as json_file:
        json.dump({"project": als_name, "tempo": tempo, "tracks": tracks_to_save}, json_file, indent=4)

    print(f"Ableton project parsed and saved to {json_output_path}")
    
def migrate_wav_to_flac(repositories_path):
    """Migrate existing WAV files to FLAC in all repositories."""
    import subprocess
    import sys
    
    compresswav_path = os.path.join(os.path.dirname(__file__), "compresswav.py")
    
    # Iterate through all project folders
    for project_id in os.listdir(repositories_path):
        project_path = os.path.join(repositories_path, project_id)
        tracks_path = os.path.join(project_path, "tracks")
        
        if not os.path.isdir(tracks_path):
            continue
            
        # Find all WAV files
        wav_files = [f for f in os.listdir(tracks_path) if f.endswith(".wav")]
        
        for wav_file in wav_files:
            wav_path = os.path.join(tracks_path, wav_file)
            flac_path = os.path.join(tracks_path, f"{os.path.splitext(wav_file)[0]}.flac")
            
            # Convert WAV to FLAC
            try:
                print(f"Converting {wav_path} to {flac_path}")
                subprocess.run([sys.executable, compresswav_path, wav_path, flac_path], check=True)
                
                # Update JSON to reference FLAC instead of WAV
                json_path = os.path.join(project_path, "ableton_project.json")
                if os.path.exists(json_path):
                    with open(json_path, 'r') as f:
                        data = json.load(f)
                    
                    # Update track references
                    for track in data.get('tracks', []):
                        if track.get('audio_file') == wav_file:
                            track['audio_file'] = f"{os.path.splitext(wav_file)[0]}.flac"
                            track['audio_format'] = "flac"
                    
                    # Save updated JSON
                    with open(json_path, 'w') as f:
                        json.dump(data, f, indent=4)
                
                # Remove original WAV file after successful conversion
                os.remove(wav_path)
                
            except Exception as e:
                print(f"Error converting {wav_path}: {e}")
                
                
                
if __name__ == "__main__":
    # Setup argument parser
    parser = argparse.ArgumentParser(description="Parse Ableton ALS file and process audio.")
    parser.add_argument("folder_path", help="Path to the folder containing the .als file (and audio files unless skipping).")
    parser.add_argument("output_folder", nargs='?', default=None, help="Optional: Path to the output folder for JSON and tracks/.")
    parser.add_argument("--skip-audio-match", action="store_true", help="Skip matching and processing audio files.")

    args = parser.parse_args()

    main(args.folder_path, args.output_folder, args.skip_audio_match)
        

